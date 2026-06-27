import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ScheduleInterviewForm from '../components/candidates/ScheduleInterviewForm'
import FeedbackForm from '../components/candidates/FeedbackForm'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'

vi.mock('../lib/api', () => ({
  default: {
    post: vi.fn(),
    patch: vi.fn(),
  },
}))

import api from '../lib/api'
const mockedApi = api as unknown as {
  post: ReturnType<typeof vi.fn>
  patch: ReturnType<typeof vi.fn>
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
    status: 201,
    statusText: 'Created',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  }
}

describe('ScheduleInterviewForm', () => {
  it('shows validation errors for empty fields', async () => {
    render(<ScheduleInterviewForm candidateId="c1" />, { wrapper: Wrapper })

    const submitButton = screen.getByRole('button', { name: /schedule interview/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/date is required/i)).toBeInTheDocument()
      expect(screen.getByText(/time is required/i)).toBeInTheDocument()
      expect(screen.getByText(/type is required/i)).toBeInTheDocument()
      expect(screen.getByText(/interviewer is required/i)).toBeInTheDocument()
    })
  })

  it('submits the form with valid input', async () => {
    mockedApi.post.mockResolvedValueOnce(makeResponse({ _id: 'i1' }))

    render(<ScheduleInterviewForm candidateId="c1" />, { wrapper: Wrapper })

    await userEvent.type(screen.getByLabelText(/date/i), '2025-08-15')
    await userEvent.type(screen.getByLabelText(/time/i), '14:30')
    await userEvent.selectOptions(screen.getByLabelText(/interview type/i), 'Technical')
    await userEvent.type(screen.getByLabelText(/interviewer/i), 'Jane Doe')

    const submitButton = screen.getByRole('button', { name: /schedule interview/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/interviews/candidates/c1', {
        date: '2025-08-15',
        time: '14:30',
        type: 'Technical',
        interviewer: 'Jane Doe',
        notes: '',
      })
    })
  })
})

describe('FeedbackForm', () => {
  it('shows validation error when recommendation is missing', async () => {
    render(<FeedbackForm interviewId="i1" candidateId="c1" />, { wrapper: Wrapper })

    const submitButton = screen.getByRole('button', { name: /save feedback/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/recommendation is required/i)).toBeInTheDocument()
    })
  })

  it('submits feedback with recommendation and note', async () => {
    mockedApi.patch.mockResolvedValueOnce(makeResponse({ _id: 'i1', status: 'Completed' }))

    render(<FeedbackForm interviewId="i1" candidateId="c1" />, { wrapper: Wrapper })

    await userEvent.selectOptions(screen.getByLabelText(/recommendation/i), 'hire')
    await userEvent.type(screen.getByLabelText(/note/i), 'Strong candidate.')

    const submitButton = screen.getByRole('button', { name: /save feedback/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(mockedApi.patch).toHaveBeenCalledWith('/interviews/i1/feedback', {
        recommendation: 'hire',
        note: 'Strong candidate.',
      })
    })
  })
})
