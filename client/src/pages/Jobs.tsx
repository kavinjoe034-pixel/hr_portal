import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { Button } from '../components/ui/Button'
import JobForm from '../components/jobs/JobForm'

interface Job {
  _id: string
  title: string
  description?: string
  skills: string[]
  status: 'Open' | 'Closed'
  candidateCount: number
  createdAt: string
}

const fetchJobs = async (): Promise<Job[]> => {
  const response = await api.get('/jobs')
  return response.data
}

const toggleJobStatus = async (id: string): Promise<Job> => {
  const response = await api.patch(`/jobs/${id}/status`)
  return response.data
}

export default function Jobs() {
  const [showForm, setShowForm] = useState(false)
  const queryClient = useQueryClient()

  const { data: jobs = [], isLoading, isError } = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
  })

  const toggleMutation = useMutation({
    mutationFn: toggleJobStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job openings</h1>
          <p className="text-gray-500">Manage open and closed positions.</p>
        </div>
        <Button
          variant={showForm ? 'secondary' : 'primary'}
          onClick={() => setShowForm((prev) => !prev)}
        >
          {showForm ? 'Hide form' : 'Create job'}
        </Button>
      </div>

      {showForm && <JobForm onSuccess={() => setShowForm(false)} />}

      {isLoading && <p className="text-gray-500">Loading jobs...</p>}
      {isError && (
        <p className="text-red-600">Failed to load jobs. Please try again.</p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Skills
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Candidates
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {jobs.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    No job openings yet.
                  </td>
                </tr>
              )}
              {jobs.map((job) => (
                <tr key={job._id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {job.title}
                    </div>
                    {job.description && (
                      <div className="mt-1 line-clamp-1 text-xs text-gray-500">
                        {job.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {job.skills.length === 0 && (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                      {job.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        job.status === 'Open'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {job.candidateCount}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant={job.status === 'Open' ? 'secondary' : 'primary'}
                      className="py-1 px-3 text-xs"
                      onClick={() => toggleMutation.mutate(job._id)}
                      disabled={toggleMutation.isPending && toggleMutation.variables === job._id}
                    >
                      {job.status === 'Open' ? 'Close' : 'Reopen'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
