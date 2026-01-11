# Premium Machines UI Library

A robust, object-oriented React component library for the Premium Machines application.

## Principles

- **SOLID**: Components are designed with Single Responsibility and Open/Closed principles in mind.
- **Inheritance**: All components inherit from `BaseComponent` for shared functionality.
- **Theming**: Built-in support for Light/Dark modes via `ThemeProvider`.

## Installation

This library is internal to the project. Import components directly from `@/components/lib`.

```typescript
import { ListingComponent, MetricCardComponent, ThemeProvider } from '@/components/lib'
```

## Usage

### ThemeProvider

Wrap your application root with `ThemeProvider`:

```tsx
// layout.tsx
import { ThemeProvider } from '@/components/lib'

export default function RootLayout({ children }) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  )
}
```

### ListingComponent

A flexible list view with pagination, sorting, and actions.

```tsx
<ListingComponent
  title="Users"
  items={users}
  loading={isLoading}
  pagination={{
    current: currentPage,
    total: totalUsers,
    pageSize: 10,
    onPageChange: (page) => setCurrentPage(page)
  }}
  actions={[
    { label: 'Add User', onClick: handleAdd, variant: 'primary', icon: 'plus' }
  ]}
  renderItem={(user) => (
    <div className="p-4 border-b flex justify-between">
      <span>{user.name}</span>
      <span>{user.email}</span>
    </div>
  )}
/>
```

### MetricCardComponent

Display key metrics with trend indicators and actions.

```tsx
<MetricCardComponent
  label="Total Revenue"
  value="$1,250,000"
  variant="primary"
  icon="money"
  trend={{
    value: 12.5,
    direction: 'up',
    label: 'vs last month'
  }}
  action={{
    label: 'View Report',
    handler: () => router.push('/financial')
  }}
/>
```

## Architecture

- **BaseComponent**: Abstract class providing error boundaries, ID management, and common prop typing.
- **Design System**: Centralized tokens for colors, typography, and spacing in `tokens.ts`.
- **Icons**: Wrapper around `react-icons` for consistent usage via string names.

## Testing

Run tests using Jest:

```bash
npm test
```
