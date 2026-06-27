import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Link,
  FileText,
  Calendar,
  MessageSquare,
  Award,
  Send,
  Ban,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Minus,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react'
import api, { API_BASE_URL } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import ScheduleInterviewForm from '../components/candidates/ScheduleInterviewForm'
import FeedbackForm from '../components/candidates/FeedbackForm'
import HireRejectActions from '../components/candidates/HireRejectActions'

type CandidateStatus =
  | 'Applied'
  | 'Form Submitted'
  | 'Interview Scheduled'
  | 'Offer Sent'
  | 'Hired'
  | 'Rejected'

interface JobRef {
  _id: string
  title: string
}

interface Offer {
  roleTitle?: string
  salaryCurrency?: string
  salaryAmount?: number
  startDate?: string
  reportingManager?: string
  location?: string
  offerLetterUrl?: string
  ndaUrl?: string
  generatedAt?: string
}

interface Candidate {
  _id: string
  name: string
  email: string
  phone?: string
  location?: string
  currentRole?: string
  noticePeriod?: string
  salaryExpectation?: string
  linkedInUrl?: string
  resumeUrl?: string
  resumeOriginalName?: string
  status: CandidateStatus
  jobId: JobRef
  offer?: Offer
  rejectionReason?: string
  lastActivityAt: string
  createdAt: string
}

interface Interview {
  _id: string
  candidateId: string | { _id: string; name: string }
  date: string
  time: string
  type: 'Screening' | 'Technical'
  interviewer: string
  notes?: string
  status: 'Scheduled' | 'Completed'
  feedback?: {
    recommendation: 'hire' | 'no-hire' | 'maybe'
    note?: string
  }
  createdAt: string
}

interface TimelineEvent {
  _id: string
  type: string
  title: string
  description?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

interface ProfileResponse {
  candidate: Candidate
  interviews: Interview[]
  timeline: TimelineEvent[]
}

const fetchProfile = async (id: string): Promise<ProfileResponse> => {
  const response = await api.get(`/candidates/${id}`)
  return response.data
}

const generateOffer = async (id: string) => {
  const response = await api.post(`/candidates/${id}/offer`)
  return response.data
}

function formatDateTime(value: string): string {
  if (!value) return '—'
  const date = new Date(value)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(value: string): string {
  if (!value) return '—'
  const date = new Date(value)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const isTerminal = (status: CandidateStatus) =>
  status === 'Hired' || status === 'Rejected'

const timelineConfig: Record<
  string,
  { icon: React.ReactNode; color: string }
> = {
  Applied: { icon: <FileText className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
  'Form Submitted': {
    icon: <Send className="h-4 w-4" />,
    color: 'bg-indigo-100 text-indigo-800',
  },
  'Interview Scheduled': {
    icon: <Calendar className="h-4 w-4" />,
    color: 'bg-amber-100 text-amber-800',
  },
  'Interview Completed': {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'bg-teal-100 text-teal-800',
  },
  'Offer Sent': {
    icon: <Award className="h-4 w-4" />,
    color: 'bg-purple-100 text-purple-800',
  },
  Hired: { icon: <ThumbsUp className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  Rejected: { icon: <Ban className="h-4 w-4" />, color: 'bg-red-100 text-red-800' },
}

const recommendationBadge = (recommendation?: string) => {
  switch (recommendation) {
    case 'hire':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
          <ThumbsUp className="h-3 w-3" /> Hire
        </span>
      )
    case 'no-hire':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
          <ThumbsDown className="h-3 w-3" /> No hire
        </span>
      )
    case 'maybe':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          <Minus className="h-3 w-3" /> Maybe
        </span>
      )
    default:
      return null
  }
}

export default function CandidateProfile() {
  const { id = '' } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [showSchedule, setShowSchedule] = useState(false)
  const [feedbackInterviewId, setFeedbackInterviewId] = useState<string | null>(
    null,
  )

  const { data, isLoading, isError } = useQuery({
    queryKey: ['candidate', id],
    queryFn: () => fetchProfile(id),
    enabled: id.length > 0,
  })

  const offerMutation = useMutation({
    mutationFn: () => generateOffer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', id] })
    },
  })

  const candidate = data?.candidate
  const interviews = data?.interviews ?? []
  const timeline = data?.timeline ?? []

  if (isLoading) {
    return (
      <div className="text-center text-gray-500">Loading candidate profile...</div>
    )
  }

  if (isError || !candidate) {
    return (
      <div className="text-center text-red-600">
        Failed to load candidate profile. Please try again.
      </div>
    )
  }

  const scheduleVisible = !isTerminal(candidate.status)
  const generateOfferVisible =
    candidate.status === 'Interview Scheduled' ||
    candidate.status === 'Offer Sent'
  const hireVisible = !isTerminal(candidate.status) && !!candidate.offer?.offerLetterUrl
  const rejectVisible = !isTerminal(candidate.status)

  const infoItems = [
    { icon: <Mail className="h-4 w-4" />, label: 'Email', value: candidate.email },
    { icon: <Phone className="h-4 w-4" />, label: 'Phone', value: candidate.phone },
    {
      icon: <MapPin className="h-4 w-4" />,
      label: 'Location',
      value: candidate.location,
    },
    {
      icon: <Briefcase className="h-4 w-4" />,
      label: 'Current role',
      value: candidate.currentRole,
    },
    {
      icon: <Clock className="h-4 w-4" />,
      label: 'Notice period',
      value: candidate.noticePeriod,
    },
    {
      icon: <DollarSign className="h-4 w-4" />,
      label: 'Salary expectation',
      value: candidate.salaryExpectation,
    },
    {
      icon: <Link className="h-4 w-4" />,
      label: 'LinkedIn',
      value: candidate.linkedInUrl ? (
        <a
          href={candidate.linkedInUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          View profile
        </a>
      ) : null,
    },
  ]

  return (
    <div className="space-y-6">
      <button
        onClick={() => window.history.back()}
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{candidate.name}</h1>
            <p className="text-gray-500">{candidate.jobId?.title ?? '—'}</p>
          </div>
          <Badge variant={candidate.status}>{candidate.status}</Badge>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {infoItems.map((item) =>
            item.value ? (
              <div key={item.label} className="flex items-start gap-3">
                <div className="mt-0.5 text-gray-400">{item.icon}</div>
                <div>
                  <p className="text-xs font-medium text-gray-500">{item.label}</p>
                  <p className="text-sm text-gray-900">{item.value}</p>
                </div>
              </div>
            ) : null,
          )}
        </div>

        {candidate.resumeUrl && (
          <div className="mt-6">
            <a
              href={`${API_BASE_URL}${candidate.resumeUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
            >
              <FileText className="h-4 w-4" />
              Download resume
              {candidate.resumeOriginalName
                ? ` (${candidate.resumeOriginalName})`
                : ''}
            </a>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Actions</h2>
        <div className="flex flex-wrap gap-3">
          {scheduleVisible && (
            <Button
              variant="secondary"
              onClick={() => setShowSchedule((prev) => !prev)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {showSchedule ? 'Cancel' : 'Schedule Interview'}
            </Button>
          )}
          {generateOfferVisible && (
            <Button
              variant="secondary"
              onClick={() => offerMutation.mutate()}
              disabled={offerMutation.isPending}
              className="flex items-center gap-2"
            >
              <Award className="h-4 w-4" />
              {offerMutation.isPending
                ? 'Generating...'
                : 'Generate Offer Documents'}
            </Button>
          )}
        </div>
        {offerMutation.isError && (
          <p className="mt-3 text-sm text-red-600">
            Failed to generate offer documents. Please try again.
          </p>
        )}
        {(hireVisible || rejectVisible) && (
          <div className="mt-4">
            <HireRejectActions
              candidateId={candidate._id}
              hasOffer={!!candidate.offer?.offerLetterUrl}
            />
          </div>
        )}
        {showSchedule && (
          <div className="mt-4">
            <ScheduleInterviewForm
              candidateId={candidate._id}
              onSuccess={() => setShowSchedule(false)}
            />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Interviews</h2>
        {interviews.length === 0 ? (
          <p className="text-sm text-gray-500">No interviews yet.</p>
        ) : (
          <div className="space-y-4">
            {interviews.map((interview) => (
              <div
                key={interview._id}
                className="rounded-md border border-gray-200 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {interview.type} interview with {interview.interviewer}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(interview.date)} at {interview.time}
                    </p>
                    {interview.notes && (
                      <p className="mt-1 text-xs text-gray-600">
                        {interview.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {interview.status === 'Completed' &&
                      recommendationBadge(interview.feedback?.recommendation)}
                    <Badge
                      variant={
                        interview.status === 'Completed' ? 'Hired' : 'Interview Scheduled'
                      }
                    >
                      {interview.status}
                    </Badge>
                    {interview.status === 'Scheduled' && (
                      <Button
                        variant="secondary"
                        className="px-2 py-1 text-xs"
                        onClick={() =>
                          setFeedbackInterviewId((current) =>
                            current === interview._id ? null : interview._id,
                          )
                        }
                      >
                        {feedbackInterviewId === interview._id
                          ? 'Cancel'
                          : 'Add feedback'}
                      </Button>
                    )}
                  </div>
                </div>
                {feedbackInterviewId === interview._id && (
                  <div className="mt-4">
                    <FeedbackForm
                      interviewId={interview._id}
                      candidateId={candidate._id}
                      onSuccess={() => setFeedbackInterviewId(null)}
                    />
                  </div>
                )}
                {interview.status === 'Completed' && interview.feedback?.note && (
                  <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                    <span className="font-medium">Note:</span>{' '}
                    {interview.feedback.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Timeline</h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-gray-500">No timeline events yet.</p>
        ) : (
          <ul className="space-y-4">
            {timeline.map((event) => {
              const config = timelineConfig[event.type] ?? {
                icon: <MessageSquare className="h-4 w-4" />,
                color: 'bg-gray-100 text-gray-800',
              }
              return (
                <li key={event._id} className="flex gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.color}`}
                  >
                    {config.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {event.title}
                    </p>
                    {event.description && (
                      <p className="text-sm text-gray-600">
                        {event.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      {formatDateTime(event.createdAt)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
