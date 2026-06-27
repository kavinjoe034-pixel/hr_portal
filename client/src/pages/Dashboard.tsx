import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Search } from 'lucide-react'

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

interface Candidate {
  _id: string
  name: string
  email: string
  jobId: JobRef
  status: CandidateStatus
  lastActivityAt: string
  createdAt: string
}

const statusOptions: CandidateStatus[] = [
  'Applied',
  'Form Submitted',
  'Interview Scheduled',
  'Offer Sent',
  'Hired',
  'Rejected',
]

const fetchCandidates = async ({
  status,
  q,
}: {
  status: string
  q: string
}): Promise<Candidate[]> => {
  const params: Record<string, string> = {}
  if (status) params.status = status
  if (q) params.q = q
  const response = await api.get('/candidates', { params })
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

export default function Dashboard() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')

  const { data: candidates = [], isLoading, isError } = useQuery({
    queryKey: ['candidates', { status, q }],
    queryFn: () => fetchCandidates({ status, q }),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-500">Track and manage your hiring pipeline.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Last Activity
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-sm text-gray-500"
                >
                  Loading candidates...
                </td>
              </tr>
            )}

            {isError && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-sm text-red-600"
                >
                  Failed to load candidates. Please try again.
                </td>
              </tr>
            )}

            {!isLoading && !isError && candidates.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-sm text-gray-500"
                >
                  No candidates found.
                </td>
              </tr>
            )}

            {!isLoading &&
              !isError &&
              candidates.map((candidate) => (
                <tr
                  key={candidate._id}
                  onClick={() => navigate(`/candidates/${candidate._id}`)}
                  className="cursor-pointer hover:bg-gray-50"
                  data-testid="candidate-row"
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {candidate.name}
                    </div>
                    <div className="text-xs text-gray-500">{candidate.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {candidate.jobId?.title ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={candidate.status}>{candidate.status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(candidate.lastActivityAt)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
