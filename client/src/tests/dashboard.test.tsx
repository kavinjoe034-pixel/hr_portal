import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import Dashboard from '../pages/Dashboard'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'

vi.mock('../lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

import api from '../lib/api'
const mockedApi = api as unknown as { get: ReturnType<typeof vi.fn> }

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </BrowserRouter>
  )
}

function makeResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  }
}

const mockCandidates = [
  {
    _id: 'c1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    jobId: { _id: 'j1', title: 'Senior Frontend Engineer' },
    status: 'Applied',
    lastActivityAt: '2024-01-15T10:00:00.000Z',
    createdAt: '2024-01-15T10:00:00.000Z',
  },
  {
    _id: 'c2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    jobId: { _id: 'j2', title: 'Product Manager' },
    status: 'Interview Scheduled',
    lastActivityAt: '2024-01-16T14:30:00.000Z',
    createdAt: '2024-01-16T14:30:00.000Z',
  },
]

describe('Dashboard', () => {
  it('renders loading state initially', () => {
    mockedApi.get.mockImplementationOnce(
      () => new Promise(() => {}), // never resolves
    )

    render(<Dashboard />, { wrapper: Wrapper })

    expect(screen.getByText(/loading candidates/i)).toBeInTheDocument()
  })

  it('renders candidate rows when data is returned', async () => {
    mockedApi.get.mockResolvedValueOnce(makeResponse(mockCandidates))

    render(<Dashboard />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
    expect(screen.getByText('Product Manager')).toBeInTheDocument()
    expect(screen.getAllByTestId('candidate-row')).toHaveLength(2)
  })
})
