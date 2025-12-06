# Ontario Appointment Booking - Frontend

React-based frontend for the Ontario Health OAB v2.0 compliant appointment booking system.

## Features

- **Multi-step Booking Flow**: Intuitive appointment booking with provider selection, date/time picking, and patient information
- **Admin Dashboard**: Staff interface for managing bookings and viewing audit logs
- **Authentication**: JWT-based authentication with role-based access control
- **Accessibility**: WCAG 2.0 Level AA compliant with keyboard navigation and screen reader support
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Type Safety**: Full TypeScript support

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **React Router** for client-side routing
- **Axios** for API communication
- **Tailwind CSS** for styling
- **Vitest** for unit testing
- **Testing Library** for component testing

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at http://localhost:3000

### Build

```bash
npm run build
```

### Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Linting & Type Checking

```bash
# Lint
npm run lint

# Type check
npm run typecheck
```

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── Alert.tsx       # Accessible alert component
│   ├── Button.tsx      # Accessible button component
│   ├── Input.tsx       # Accessible input component
│   ├── Layout.tsx      # Main layout with navigation
│   ├── LoadingSpinner.tsx
│   └── ProtectedRoute.tsx
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication state
├── lib/                # Utilities and API client
│   └── api.ts          # Axios API client
├── pages/              # Page components
│   ├── Home.tsx
│   ├── Login.tsx
│   ├── BookAppointment.tsx
│   └── admin/
│       ├── Dashboard.tsx
│       ├── Bookings.tsx
│       └── AuditLogs.tsx
├── types/              # TypeScript type definitions
│   └── index.ts
├── App.tsx             # Root component with routes
└── main.tsx            # Application entry point
```

## Accessibility Features

This application is designed to be accessible to all users:

### WCAG 2.0 Level AA Compliance

- **Semantic HTML**: Proper use of headings, landmarks, and ARIA attributes
- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **Focus Management**: Clear focus indicators and logical tab order
- **Screen Reader Support**: Descriptive labels and live regions
- **Color Contrast**: All text meets minimum contrast ratios
- **Form Validation**: Clear error messages with ARIA live regions

### Specific Features

- Skip to main content link
- ARIA labels on all form inputs
- Loading states announced to screen readers
- Error alerts with appropriate urgency levels
- Modal dialogs with focus trapping
- Keyboard-accessible dropdowns and date pickers

## Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:8080
```

## API Integration

The frontend communicates with the backend API at `http://localhost:8080` by default. API requests are automatically proxied during development via Vite.

### Authentication

- JWT tokens stored in localStorage
- Automatic token injection in API requests
- Automatic redirect to login on 401 responses

### API Client Structure

```typescript
// Public API (no auth required)
publicApi.getProviders()
publicApi.getAvailability()
publicApi.createBooking()

// Auth API
authApi.login()
authApi.logout()
authApi.getCurrentUser()

// Admin API (requires authentication)
adminApi.getBookings()
adminApi.approveBooking()
adminApi.declineBooking()
adminApi.getAuditLogs()
```

## Components

### Alert

Accessible alert component with multiple variants:

```tsx
<Alert type="error">An error occurred</Alert>
<Alert type="success" onClose={handleClose}>Success!</Alert>
```

### Button

Accessible button with loading states:

```tsx
<Button variant="primary" loading={isLoading}>
  Submit
</Button>
```

### Input

Form input with built-in validation and error display:

```tsx
<Input
  label="Email"
  type="email"
  required
  error={errors.email}
  helperText="We'll never share your email"
/>
```

## Testing

Tests are written using Vitest and Testing Library:

```typescript
// Component test
describe('Button', () => {
  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance

- Code splitting via React Router
- Lazy loading of admin routes
- Optimized production builds with Vite
- Tree shaking of unused code

## Security

- XSS protection via React's built-in escaping
- CSRF protection via backend
- No sensitive data in localStorage (only JWT token)
- Automatic token expiration handling

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Ensure accessibility compliance
4. Run linting and type checking before commits

## License

This is a demonstration project for Ontario Health OAB v2.0 compliance.
