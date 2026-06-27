import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AddCandidateForm from '../components/candidates/AddCandidateForm'
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

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
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

const mockJobs = [
  { _id: 'j1', title: 'Senior Frontend Engineer', status: 'Open' },
  { _id: 'j2', title: 'Product Manager', status: 'Closed' },
  { _id: 'j3', title: 'Backend Engineer', status: 'Open' },
]

describe('AddCandidateForm', () => {
  it('shows validation errors for empty fields', async () => {
    mockedApi.get.mockResolvedValueOnce(makeResponse(mockJobs))

    render(<AddCandidateForm />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
    })

    const submitButton = screen.getByRole('button', { name: /add candidate/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/job opening is required/i)).toBeInTheDocument()
      expect(screen.getByText(/resume is required/i)).toBeInTheDocument()
    })
  })

  it('allows selecting a PDF resume file', async () => {
    mockedApi.get.mockResolvedValueOnce(makeResponse(mockJobs))

    render(<AddCandidateForm />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
    })

    const file = new File(['resume content'], 'resume.pdf', {
      type: 'application/pdf',
    })
    const fileInput = screen.getByLabelText(/resume/i)
    await userEvent.upload(fileInput, file)

    expect(fileInput).toHaveProperty('files')
    expect((fileInput as HTMLInputElement).files?.[0]).toEqual(file)
  })
})
