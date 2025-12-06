import { Link } from 'react-router-dom';

// Get the current host to make links work from any IP (LAN access)
const getClinicUrl = (port: number) => {
  const host = window.location.hostname;
  return `http://${host}:${port}`;
};

export function About() {
  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Project Overview */}
      <section>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Ontario Appointment Booking System
        </h1>
        <div className="prose prose-primary max-w-none">
          <p className="text-lg text-gray-700 leading-relaxed">
            A production-ready Online Appointment Booking (OAB) system designed to meet
            <strong> Ontario Health's Service Standard Version 2.0</strong>. This platform enables
            patients and caregivers to self-book healthcare appointments electronically while
            maintaining strict compliance with privacy, security, and accessibility requirements
            under Ontario's Personal Health Information Protection Act (PHIPA).
          </p>
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Demo Notice:</strong> This is a demonstration system with synthetic/fictional data only.
              No real patient information is stored or processed.
            </p>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Key Features</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Patient Self-Service</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Book, reschedule, and cancel appointments online</li>
              <li>Book for yourself or family members (dependents)</li>
              <li>Real-time availability viewing</li>
              <li>Multiple appointment modalities (in-person, video, phone)</li>
            </ul>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Security & Compliance</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>PHIPA compliant data handling</li>
              <li>Canadian data residency</li>
              <li>Comprehensive audit logging</li>
              <li>Role-based access control (RBAC)</li>
            </ul>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Accessibility</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>WCAG 2.0 Level AA compliant</li>
              <li>Screen reader compatible</li>
              <li>Keyboard navigation support</li>
              <li>Mobile-responsive design</li>
            </ul>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Clinic Administration</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Provider schedule management</li>
              <li>Booking approval workflows</li>
              <li>Statistical reporting</li>
              <li>PHIPA-compliant audit trail</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Developer Profile */}
      <section className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-8 border border-green-200">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-3xl text-white">E</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Built by Ecoworks</h2>
            <p className="text-gray-700 mb-4">
              Ecoworks is a Canadian software development company specializing in healthcare technology
              solutions. We focus on building compliant, accessible, and user-friendly systems that
              meet the unique regulatory requirements of Canadian healthcare.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                Healthcare Tech
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                PHIPA Compliance
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                Accessibility First
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                Canadian Data Residency
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Variants */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Platform Variants</h2>
        <p className="text-gray-600 mb-6">
          Our appointment booking platform is designed as a flexible foundation that can be customized
          for different healthcare and service sectors. Each variant shares the same robust core while
          adapting to sector-specific needs.
        </p>

        <div className="space-y-4">
          {/* Active Variants */}
          <h3 className="text-lg font-medium text-gray-800">Available Now</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <a
              href={getClinicUrl(3001)}
              className="block bg-white rounded-lg border-2 border-primary-200 p-5 hover:border-primary-400 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🏥</span>
                <h4 className="font-semibold text-gray-900">Medical Clinic</h4>
                <span className="ml-auto px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                  Live
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Family medicine clinics with PHIPA compliance, patient rostering,
                and caregiver booking for dependents.
              </p>
              <p className="text-xs text-primary-600 mt-2">{window.location.hostname}:3001</p>
            </a>

            <a
              href={getClinicUrl(3002)}
              className="block bg-white rounded-lg border-2 border-green-200 p-5 hover:border-green-400 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🐾</span>
                <h4 className="font-semibold text-gray-900">Veterinary Clinic</h4>
                <span className="ml-auto px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                  Live
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Pet care clinics with PIPEDA compliance, multi-pet management,
                breed database, and species-specific appointments.
              </p>
              <p className="text-xs text-green-600 mt-2">{window.location.hostname}:3002</p>
            </a>
          </div>

          {/* Platform Features Roadmap */}
          <h3 className="text-lg font-medium text-gray-800 mt-8">Coming Soon</h3>
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200 p-6 mb-6">
            <div className="flex items-start gap-4">
              <span className="text-3xl">💬</span>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Conversational Chat Interface
                  <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                    Priority
                  </span>
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  An AI-powered chat assistant that allows users to interact with the booking system
                  naturally. Simply describe what you need and the assistant will help you:
                </p>
                <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                  <li>"Book a checkup for my daughter next week"</li>
                  <li>"When is my next appointment?"</li>
                  <li>"Reschedule my Monday appointment to Wednesday"</li>
                  <li>"Find an available time with Dr. Smith this month"</li>
                </ul>
                <p className="text-xs text-purple-600 mt-3">
                  Making healthcare booking as easy as having a conversation
                </p>
              </div>
            </div>
          </div>

          {/* Planned Variants */}
          <h3 className="text-lg font-medium text-gray-800">Planned Variants</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-5 opacity-75">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🦷</span>
                <h4 className="font-semibold text-gray-700">Dental Clinic</h4>
                <span className="ml-auto px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                  Planned
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Dental practices with treatment planning, hygiene scheduling,
                and insurance pre-authorization.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-200 p-5 opacity-75">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">👁️</span>
                <h4 className="font-semibold text-gray-700">Optometry</h4>
                <span className="ml-auto px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                  Planned
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Eye care clinics with exam types, prescription tracking,
                and eyewear ordering integration.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-200 p-5 opacity-75">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🧠</span>
                <h4 className="font-semibold text-gray-700">Mental Health</h4>
                <span className="ml-auto px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                  Planned
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Therapy and counseling with session types, recurring appointments,
                and enhanced privacy controls.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-200 p-5 opacity-75">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">💆</span>
                <h4 className="font-semibold text-gray-700">Physiotherapy</h4>
                <span className="ml-auto px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded">
                  Future
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Rehab clinics with treatment series, progress tracking,
                and referral management.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-200 p-5 opacity-75">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">💉</span>
                <h4 className="font-semibold text-gray-700">Walk-in Clinic</h4>
                <span className="ml-auto px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded">
                  Future
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Same-day urgent care with queue management, wait time estimates,
                and triage prioritization.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-200 p-5 opacity-75">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🏋️</span>
                <h4 className="font-semibold text-gray-700">Fitness & Wellness</h4>
                <span className="ml-auto px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded">
                  Future
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Personal training, nutrition consulting, and wellness coaching
                with session packages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Stack */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Technology Stack</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Backend</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Node.js + TypeScript + Express</li>
                <li>PostgreSQL with Prisma ORM</li>
                <li>Zod validation</li>
                <li>OpenAPI/Swagger documentation</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Frontend</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>React 18 + TypeScript</li>
                <li>Vite build system</li>
                <li>Tailwind CSS</li>
                <li>React Router</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Infrastructure</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Docker + Docker Compose</li>
                <li>GitHub Actions CI/CD</li>
                <li>Clerk passwordless authentication</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Testing</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Jest unit tests (116+ passing)</li>
                <li>Playwright E2E tests</li>
                <li>axe-core accessibility testing</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="text-center py-8">
        <p className="text-gray-600">
          Interested in a custom variant for your organization?
        </p>
        <p className="text-primary-600 font-medium mt-2">
          Contact Ecoworks for enterprise solutions
        </p>
      </section>

      {/* Back link */}
      <div className="pt-4 border-t border-gray-200">
        <Link
          to="/"
          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          &larr; Back to Home
        </Link>
      </div>
    </div>
  );
}
