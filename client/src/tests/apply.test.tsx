import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Apply from '../pages/Apply'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'

vi.mock('../lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import api from '../lib/api'
const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
}

function Wrapper({ initialEntries }: { initialEntries: string[] }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/apply/:token" element={<Apply />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function makeResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Not Found',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  }
}

describe('Apply', () => {
  it('shows an error when the token is invalid or expired', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Not found'))

    render(<Wrapper initialEntries={['/apply/expired-token']} />)

    expect(screen.getByText(/verifying your link/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/link unavailable/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/this link is invalid or has expired/i)).toBeInTheDocument()
  })

  it('renders the application form for a valid token', async () => {
    mockedApi.get.mockResolvedValueOnce(
      makeResponse({ valid: true, candidate: { name: 'Alice Smith' } })
    )

    render(<Wrapper initialEntries={['/apply/valid-token']} />)

    await waitFor(() => {
      expect(screen.getByText(/complete your application/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/hi, alice smith/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/current role/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/notice period/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/salary expectation/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/linkedin url/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit application/i })).toBeInTheDocument()
  })
})
