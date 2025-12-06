import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import logger from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Lazy-initialize Anthropic client (to ensure env vars are loaded)
let anthropicClient: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// Rate limiting state (in-memory for now, use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_PER_MINUTE = parseInt(process.env.CHAT_RATE_LIMIT_PER_MINUTE || '20', 10);

// Request validation schema
const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(10000),
  })).min(1).max(50),
  sessionId: z.string().uuid().optional(),
});

// Tool definitions for the assistant
const tools: Anthropic.Messages.Tool[] = [
  {
    name: 'list_providers',
    description: 'Get a list of available healthcare providers/doctors at the clinic. Returns their names, specialties, and availability.',
    input_schema: {
      type: 'object' as const,
      properties: {
        specialty: {
          type: 'string',
          description: 'Optional filter by specialty (e.g., "Family Medicine")',
        },
      },
      required: [],
    },
  },
  {
    name: 'list_appointment_types',
    description: 'Get available appointment types with their durations. Use this when the user wants to know what kinds of appointments they can book.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'check_availability',
    description: 'Check available time slots for a specific provider on a given date. The user must specify or confirm the provider and date.',
    input_schema: {
      type: 'object' as const,
      properties: {
        providerId: {
          type: 'string',
          description: 'The UUID of the provider',
        },
        date: {
          type: 'string',
          description: 'The date to check in YYYY-MM-DD format',
        },
        appointmentTypeId: {
          type: 'string',
          description: 'Optional appointment type UUID to filter by duration requirements',
        },
      },
      required: ['providerId', 'date'],
    },
  },
  {
    name: 'check_availability_multi',
    description: 'Check available time slots for a provider across multiple dates at once. Use this instead of calling check_availability multiple times. Returns availability summary for each date.',
    input_schema: {
      type: 'object' as const,
      properties: {
        providerId: {
          type: 'string',
          description: 'The UUID of the provider',
        },
        dates: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of dates to check in YYYY-MM-DD format (max 7 dates)',
        },
        appointmentTypeId: {
          type: 'string',
          description: 'Optional appointment type UUID to filter by duration requirements',
        },
      },
      required: ['providerId', 'dates'],
    },
  },
  {
    name: 'get_user_bookings',
    description: 'Get the current user\'s upcoming appointments. Use this when user asks about their scheduled appointments.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clerkUserId: {
          type: 'string',
          description: 'The Clerk user ID (will be provided by system)',
        },
      },
      required: [],
    },
  },
  {
    name: 'book_appointment',
    description: 'Book an appointment for a patient. Use this after confirming all details with the user: provider, date, time, appointment type, and modality. For demo purposes, creates a booking with a demo patient.',
    input_schema: {
      type: 'object' as const,
      properties: {
        providerId: {
          type: 'string',
          description: 'The UUID of the provider',
        },
        date: {
          type: 'string',
          description: 'The appointment date in YYYY-MM-DD format',
        },
        time: {
          type: 'string',
          description: 'The appointment time in HH:MM format (24-hour)',
        },
        appointmentTypeId: {
          type: 'string',
          description: 'The UUID of the appointment type',
        },
        modality: {
          type: 'string',
          enum: ['in-person', 'video', 'phone'],
          description: 'How the appointment will be conducted',
        },
        reason: {
          type: 'string',
          description: 'Optional reason for the visit',
        },
        patientName: {
          type: 'string',
          description: 'Name of the patient (for demo bookings)',
        },
        patientEmail: {
          type: 'string',
          description: 'Email of the patient (for demo bookings)',
        },
      },
      required: ['providerId', 'date', 'time', 'appointmentTypeId', 'modality'],
    },
  },
];

// Tool execution functions
async function executeListProviders(specialty?: string) {
  const where = specialty ? { specialty: { contains: specialty, mode: 'insensitive' as const } } : {};
  const providers = await prisma.provider.findMany({
    where,
    select: {
      id: true,
      name: true,
      displayName: true,
      specialty: true,
      team: true,
      acceptsNewPatients: true,
      bio: true,
    },
    orderBy: { name: 'asc' },
  });
  return providers;
}

async function executeListAppointmentTypes() {
  const types = await prisma.appointmentType.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      duration: true,
      description: true,
      isCommon: true,
    },
    orderBy: { isCommon: 'desc' },
  });
  return types;
}

async function executeCheckAvailability(providerId: string, date: string, appointmentTypeId?: string) {
  // Get provider's working hours
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { workingHours: true, name: true },
  });

  if (!provider) {
    return { error: 'Provider not found' };
  }

  // Get appointment type duration if specified
  let duration = 15; // default 15 minutes
  if (appointmentTypeId) {
    const aptType = await prisma.appointmentType.findUnique({
      where: { id: appointmentTypeId },
      select: { duration: true },
    });
    if (aptType) duration = aptType.duration;
  }

  // Get existing bookings for that day
  const existingBookings = await prisma.booking.findMany({
    where: {
      providerId,
      date: new Date(date),
      status: { in: ['pending', 'confirmed'] },
    },
    select: { time: true },
  });

  const bookedTimes = new Set(existingBookings.map(b => b.time));

  // Parse working hours for the day of week (use full day name to match DB format)
  const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const workingHours = provider.workingHours as Record<string, string[]> | null;

  if (!workingHours || !workingHours[dayOfWeek]) {
    return {
      providerName: provider.name,
      date,
      slots: [],
      message: 'Provider is not available on this day',
    };
  }

  const [startTime, endTime] = workingHours[dayOfWeek];

  // Generate available slots
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  while (currentMinutes + duration <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

    if (!bookedTimes.has(timeStr)) {
      slots.push(timeStr);
    }

    currentMinutes += 15; // 15-minute increments
  }

  return {
    providerName: provider.name,
    date,
    slots,
    totalAvailable: slots.length,
  };
}

// Batch availability check for multiple dates (more efficient than calling check_availability multiple times)
async function executeCheckAvailabilityMulti(
  providerId: string,
  dates: string[],
  appointmentTypeId?: string
) {
  // Limit to 7 dates max
  const limitedDates = dates.slice(0, 7);

  // Get provider's working hours (single query)
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { workingHours: true, name: true },
  });

  if (!provider) {
    return { error: 'Provider not found' };
  }

  // Get appointment type duration if specified (single query)
  let duration = 15;
  if (appointmentTypeId) {
    const aptType = await prisma.appointmentType.findUnique({
      where: { id: appointmentTypeId },
      select: { duration: true },
    });
    if (aptType) duration = aptType.duration;
  }

  // Get all existing bookings for all dates in one query
  const startDate = new Date(Math.min(...limitedDates.map(d => new Date(d).getTime())));
  const endDate = new Date(Math.max(...limitedDates.map(d => new Date(d).getTime())));
  endDate.setDate(endDate.getDate() + 1); // Include the last date

  const existingBookings = await prisma.booking.findMany({
    where: {
      providerId,
      date: { gte: startDate, lt: endDate },
      status: { in: ['pending', 'confirmed'] },
    },
    select: { date: true, time: true },
  });

  // Group bookings by date
  const bookingsByDate = new Map<string, Set<string>>();
  for (const booking of existingBookings) {
    const dateStr = booking.date.toISOString().split('T')[0];
    if (!bookingsByDate.has(dateStr)) {
      bookingsByDate.set(dateStr, new Set());
    }
    bookingsByDate.get(dateStr)!.add(booking.time);
  }

  const workingHours = provider.workingHours as Record<string, string[]> | null;

  // Generate availability for each date
  const availability = limitedDates.map(date => {
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    if (!workingHours || !workingHours[dayOfWeek]) {
      return {
        date,
        dayOfWeek: dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1),
        available: false,
        slots: [],
        totalAvailable: 0,
        message: 'Provider is not available on this day',
      };
    }

    const [startTime, endTime] = workingHours[dayOfWeek];
    const bookedTimes = bookingsByDate.get(date) || new Set<string>();

    // Generate available slots
    const slots: string[] = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    while (currentMinutes + duration <= endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const mins = currentMinutes % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

      if (!bookedTimes.has(timeStr)) {
        slots.push(timeStr);
      }

      currentMinutes += 15;
    }

    return {
      date,
      dayOfWeek: dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1),
      available: slots.length > 0,
      slots,
      totalAvailable: slots.length,
      // Provide a summary for quick display
      summary: slots.length > 0
        ? `${slots.length} slots (${slots[0]} - ${slots[slots.length - 1]})`
        : 'No availability',
    };
  });

  return {
    providerName: provider.name,
    availability,
    totalDatesWithAvailability: availability.filter(a => a.available).length,
  };
}

async function executeGetUserBookings(clerkUserId?: string) {
  if (!clerkUserId) {
    return { error: 'User not authenticated', bookings: [] };
  }

  // Find patient account by clerk user ID
  const account = await prisma.patientAccount.findUnique({
    where: { clerkUserId },
    include: {
      familyMembers: {
        where: { isActive: true },
        select: { id: true, name: true, relationship: true },
      },
    },
  });

  if (!account) {
    return { bookings: [], message: 'No account found. Please complete registration first.' };
  }

  const familyMemberIds = account.familyMembers.map(fm => fm.id);
  const familyMemberMap = new Map(account.familyMembers.map(fm => [fm.id, fm]));

  // Use FamilyMemberBooking model for the new account structure
  const bookings = await prisma.familyMemberBooking.findMany({
    where: {
      familyMemberId: { in: familyMemberIds },
      status: { in: ['pending', 'confirmed'] },
      date: { gte: new Date() },
    },
    include: {
      familyMember: { select: { name: true, relationship: true } },
    },
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
    take: 10,
  });

  // Get provider and appointment type info separately (FamilyMemberBooking doesn't have relations)
  const providerIds = [...new Set(bookings.map(b => b.providerId))];
  const appointmentTypeIds = [...new Set(bookings.map(b => b.appointmentTypeId))];

  const [providers, appointmentTypes] = await Promise.all([
    prisma.provider.findMany({
      where: { id: { in: providerIds } },
      select: { id: true, name: true, specialty: true },
    }),
    prisma.appointmentType.findMany({
      where: { id: { in: appointmentTypeIds } },
      select: { id: true, name: true, duration: true },
    }),
  ]);

  const providerMap = new Map(providers.map(p => [p.id, p]));
  const appointmentTypeMap = new Map(appointmentTypes.map(at => [at.id, at]));

  return {
    bookings: bookings.map(b => {
      const provider = providerMap.get(b.providerId);
      const appointmentType = appointmentTypeMap.get(b.appointmentTypeId);
      const fm = familyMemberMap.get(b.familyMemberId);

      return {
        id: b.id,
        date: b.date.toISOString().split('T')[0],
        time: b.time,
        status: b.status,
        modality: b.modality,
        provider: provider?.name || 'Unknown',
        appointmentType: appointmentType?.name || 'Unknown',
        forWhom: fm?.name || 'Self',
        relationship: fm?.relationship || 'self',
      };
    }),
  };
}

interface BookAppointmentInput {
  providerId: string;
  date: string;
  time: string;
  appointmentTypeId: string;
  modality: 'in-person' | 'video' | 'phone';
  reason?: string;
  patientName?: string;
  patientEmail?: string;
}

async function executeBookAppointment(input: BookAppointmentInput, clerkUserId?: string) {
  const { providerId, date, time, appointmentTypeId, modality, reason } = input;

  // Check authentication - require sign-in to book
  if (!clerkUserId) {
    return {
      success: false,
      requiresAuth: true,
      error: 'Please sign in to book an appointment. Click the "Sign In" button below to continue.',
    };
  }

  // Validate provider exists
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { id: true, name: true },
  });

  if (!provider) {
    return { success: false, error: 'Provider not found. Please select a valid provider.' };
  }

  // Validate appointment type exists
  const appointmentType = await prisma.appointmentType.findUnique({
    where: { id: appointmentTypeId },
    select: { id: true, name: true, duration: true },
  });

  if (!appointmentType) {
    return { success: false, error: 'Appointment type not found. Please select a valid appointment type.' };
  }

  // Check if the time slot is still available
  const existingBooking = await prisma.booking.findFirst({
    where: {
      providerId,
      date: new Date(date),
      time,
      status: { in: ['pending', 'confirmed'] },
    },
  });

  if (existingBooking) {
    return {
      success: false,
      error: 'This time slot is no longer available. Please choose a different time.'
    };
  }

  // Find patient by Clerk user ID
  let patient = await prisma.patient.findFirst({
    where: { clerkUserId },
  });

  // If no patient record linked to Clerk, try to find by PatientAccount
  if (!patient) {
    const account = await prisma.patientAccount.findUnique({
      where: { clerkUserId },
      include: {
        familyMembers: {
          where: { relationship: 'self', isActive: true },
          take: 1,
        },
      },
    });

    // For now, use a demo patient if no account exists
    // In production, would require account setup first
    if (!account) {
      patient = await prisma.patient.findFirst({
        orderBy: { createdAt: 'asc' },
      });
    }
  }

  if (!patient) {
    return {
      success: false,
      error: 'No patient record found. Please complete your profile setup first.'
    };
  }

  // Create the booking
  const booking = await prisma.booking.create({
    data: {
      providerId,
      patientId: patient.id,
      appointmentTypeId,
      date: new Date(date),
      time,
      modality,
      status: 'confirmed', // Auto-confirm for demo
      reason: reason || null,
    },
  });

  // Log the booking for audit
  await prisma.auditLog.create({
    data: {
      action: 'create_booking',
      resource: 'booking',
      resourceId: booking.id,
      payload: {
        providerId,
        date,
        time,
        modality,
        appointmentType: appointmentType.name,
        bookedVia: 'chat_assistant',
      },
      userRole: 'patient',
    },
  });

  // Format the confirmation
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return {
    success: true,
    booking: {
      id: booking.id,
      provider: provider.name,
      date: formattedDate,
      time: formattedTime,
      appointmentType: appointmentType.name,
      duration: `${appointmentType.duration} minutes`,
      modality,
      status: 'confirmed',
    },
    message: `Your appointment has been booked successfully!`,
  };
}

// Execute tool call
async function executeTool(name: string, input: Record<string, unknown>, clerkUserId?: string): Promise<unknown> {
  switch (name) {
    case 'list_providers':
      return executeListProviders(input.specialty as string | undefined);
    case 'list_appointment_types':
      return executeListAppointmentTypes();
    case 'check_availability':
      return executeCheckAvailability(
        input.providerId as string,
        input.date as string,
        input.appointmentTypeId as string | undefined
      );
    case 'check_availability_multi':
      return executeCheckAvailabilityMulti(
        input.providerId as string,
        input.dates as string[],
        input.appointmentTypeId as string | undefined
      );
    case 'get_user_bookings':
      return executeGetUserBookings(clerkUserId);
    case 'book_appointment':
      return executeBookAppointment(input as BookAppointmentInput, clerkUserId);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// Rate limiting middleware
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window

  const entry = rateLimitMap.get(identifier);

  if (!entry || entry.resetTime < windowStart) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_PER_MINUTE) {
    return false;
  }

  entry.count++;
  return true;
}

// System prompt for the assistant (dynamic to include current date)
function getSystemPrompt(): string {
  const now = new Date();
  const today = now.toLocaleDateString('en-CA'); // YYYY-MM-DD format
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

  return `You are the Ilderton Family Health clinic assistant. Today is ${dayOfWeek}, ${today}.

STYLE: Be brief and conversational. The UI shows clickable buttons for providers, times, and options - so DON'T repeat lists in text. Just add a short intro like "Our doctors:" or "Available times:".

BAD (too verbose):
"Here are our providers: 1. Dr. Smith - Family Medicine 2. Dr. Jones - Family Medicine. Reply with a number..."

GOOD (concise):
"Our doctors:" [UI shows clickable list]

GOOD (with context):
"Dr. Smith has openings Monday:" [UI shows time slots]

BOOKING FLOW:
1. Provider → 2. Appointment type → 3. Date/time → 4. Confirm → 5. Book (requires sign-in)

Use check_availability_multi for multiple dates at once (more efficient).

If book_appointment returns {requiresAuth: true}, say "Please sign in to complete your booking."

RULES:
- No medical advice - direct to their provider
- Urgent issues → call 911 or ER
- Clinic hours: Mon-Thu 9-4, Fri 9-3:30
- Keep responses under 2-3 sentences when UI components are shown`;
}

/**
 * @swagger
 * /chat:
 *   post:
 *     summary: Send a message to the AI assistant
 *     description: Conversational interface for booking appointments and clinic information
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messages
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     content:
 *                       type: string
 *               sessionId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Assistant response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                 toolResults:
 *                   type: array
 *       400:
 *         description: Invalid request
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const parseResult = chatRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parseResult.error.issues,
      });
      return;
    }

    const { messages } = parseResult.data;

    // Get user identifier for rate limiting (IP or user ID)
    const clerkUserId = (req as Request & { auth?: { userId?: string } }).auth?.userId;
    const identifier = clerkUserId || req.ip || 'anonymous';

    // Check rate limit
    if (!checkRateLimit(identifier)) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Please wait a moment before sending more messages',
        retryAfter: 60,
      });
      return;
    }

    // Convert messages to Anthropic format
    const anthropicMessages: Anthropic.Messages.MessageParam[] = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    logger.info('Chat request', {
      messageCount: messages.length,
      userId: clerkUserId || 'anonymous',
    });

    // Initial API call
    const anthropic = getAnthropicClient();
    const systemPrompt = getSystemPrompt();
    let response = await anthropic.messages.create({
      model: process.env.LLM_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: parseInt(process.env.LLM_MAX_TOKENS || '4096', 10),
      system: systemPrompt,
      tools,
      messages: anthropicMessages,
    });

    // Handle tool use in a loop
    const toolResults: Array<{ tool: string; result: unknown }> = [];

    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use'
      );

      const toolResultContents: Anthropic.Messages.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        logger.info('Executing tool', { tool: toolUse.name, input: toolUse.input });

        const result = await executeTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>,
          clerkUserId
        );

        toolResults.push({ tool: toolUse.name, result });

        toolResultContents.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      // Continue conversation with tool results
      response = await anthropic.messages.create({
        model: process.env.LLM_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: parseInt(process.env.LLM_MAX_TOKENS || '4096', 10),
        system: systemPrompt,
        tools,
        messages: [
          ...anthropicMessages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResultContents },
        ],
      });
    }

    // Extract final text response
    const textContent = response.content.find(
      (block): block is Anthropic.Messages.TextBlock => block.type === 'text'
    );

    const assistantResponse = textContent?.text || 'I apologize, but I was unable to generate a response. Please try again.';

    logger.info('Chat response', {
      toolsUsed: toolResults.map(t => t.tool),
      responseLength: assistantResponse.length,
    });

    // Generate UI component hints based on tool results
    const uiComponents: Array<{ type: string; data: unknown }> = [];

    for (const tr of toolResults) {
      if (tr.tool === 'list_providers' && Array.isArray(tr.result)) {
        uiComponents.push({ type: 'provider-select', data: tr.result });
      } else if (tr.tool === 'list_appointment_types' && Array.isArray(tr.result)) {
        uiComponents.push({ type: 'appointment-types', data: tr.result });
      } else if (tr.tool === 'check_availability') {
        const availResult = tr.result as { slots?: string[]; providerName?: string; date?: string };
        if (availResult.slots) {
          uiComponents.push({
            type: 'time-grid',
            data: {
              slots: availResult.slots.map((time: string) => ({ time, available: true })),
              providerName: availResult.providerName,
              date: availResult.date,
            },
          });
        }
      }
    }

    res.json({
      response: assistantResponse,
      toolResults: toolResults.length > 0 ? toolResults : undefined,
      uiComponents: uiComponents.length > 0 ? uiComponents : undefined,
    });

  } catch (error: unknown) {
    logger.error('Chat error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle specific Anthropic errors
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        res.status(429).json({
          error: 'Service temporarily unavailable',
          message: 'The AI service is currently busy. Please try again in a moment.',
        });
        return;
      }
    }

    res.status(500).json({
      error: 'Failed to process chat message',
      message: process.env.NODE_ENV === 'development'
        ? (error instanceof Error ? error.message : 'Unknown error')
        : 'An error occurred while processing your message',
    });
  }
});

/**
 * @swagger
 * /chat/health:
 *   get:
 *     summary: Check chat service health
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    model: process.env.LLM_MODEL || 'claude-sonnet-4-20250514',
    rateLimit: RATE_LIMIT_PER_MINUTE,
  });
});

export default router;
