import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { Badge } from '../components/ui/Badge'

interface Interview {
  _id: string
  candidateId: { _id: string; name: string }
  date: string
  time: string
  type: 'Screening' | 'Technical'
  interviewer: string
  status: 'Scheduled' | 'Completed'
  feedback?: {
    recommendation: 'hire' | 'no-hire' | 'maybe'
    note?: string
  }
}

const fetchInterviews = async (): Promise<Interview[]> => {
  const response = await api.get('/interviews')
  return response.data
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

const recommendationText = (recommendation?: string) => {
  switch (recommendation) {
    case 'hire':
      return 'Hire'
    case 'no-hire':
      return 'No hire'
    case 'maybe':
      return 'Maybe'
    default:
      return '—'
  }
}

export default function Interviews() {
  const navigate = useNavigate()
  const { data: interviews = [], isLoading, isError } = useQuery({
    queryKey: ['interviews'],
    queryFn: fetchInterviews,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
        <p className="text-gray-500">Upcoming and completed interviews.</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Candidate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Interviewer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Feedback
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-sm text-gray-500"
                >
                  Loading interviews...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-sm text-red-600"
                >
                  Failed to load interviews. Please try again.
                </td>
              </tr>
            )}
            {!isLoading && !isError && interviews.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-sm text-gray-500"
                >
                  No interviews scheduled.
                </td>
              </tr>
            )}
            {!isLoading &&
              !isError &&
              interviews.map((interview) => (
                <tr
                  key={interview._id}
                  onClick={() =>
                    navigate(`/candidates/${interview.candidateId._id}`)
                  }
                  className="cursor-pointer hover:bg-gray-50"
                  data-testid="interview-row"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {interview.candidateId.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(interview.date)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {interview.time}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {interview.type}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={
                        interview.status === 'Completed'
                          ? 'Hired'
                          : 'Interview Scheduled'
                      }
                    >
                      {interview.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {interview.interviewer}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {interview.feedback?.note
                      ? `${recommendationText(interview.feedback.recommendation)} - ${interview.feedback.note}`
                      : recommendationText(interview.feedback?.recommendation)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
