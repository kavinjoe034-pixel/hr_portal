import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface HireRejectActionsProps {
  candidateId: string
  hasOffer: boolean
  onAction?: () => void
}

interface RejectData {
  reason: string
}

const hireCandidate = async (candidateId: string) => {
  const response = await api.patch(`/candidates/${candidateId}/status`, {
    status: 'Hired',
  })
  return response.data
}

const rejectCandidate = async (candidateId: string, data: RejectData) => {
  const response = await api.patch(`/candidates/${candidateId}/status`, {
    status: 'Rejected',
    reason: data.reason,
  })
  return response.data
}

export default function HireRejectActions({
  candidateId,
  hasOffer,
  onAction,
}: HireRejectActionsProps) {
  const queryClient = useQueryClient()
  const [showReject, setShowReject] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectData>()

  const hireMutation = useMutation({
    mutationFn: () => hireCandidate(candidateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] })
      if (onAction) {
        onAction()
      }
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (data: RejectData) => rejectCandidate(candidateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] })
      reset()
      setShowReject(false)
      if (onAction) {
        onAction()
      }
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          onClick={() => hireMutation.mutate()}
          disabled={!hasOffer || hireMutation.isPending}
          title={
            hasOffer
              ? 'Mark candidate as hired'
              : 'Generate an offer letter before hiring'
          }
        >
          {hireMutation.isPending ? 'Hiring...' : 'Mark as Hired'}
        </Button>
        <Button
          variant="danger"
          onClick={() => setShowReject((prev) => !prev)}
          disabled={rejectMutation.isPending}
        >
          {showReject ? 'Cancel' : 'Mark as Rejected'}
        </Button>
      </div>

      {hireMutation.isError && (
        <p className="text-sm text-red-600">
          Failed to hire candidate. Please try again.
        </p>
      )}

      {showReject && (
        <form
          onSubmit={handleSubmit((data) => rejectMutation.mutate(data))}
          className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4"
          aria-label="Reject candidate form"
        >
          <Input
            label="Rejection reason"
            placeholder="e.g. Not a culture fit"
            error={errors.reason?.message}
            {...register('reason', { required: 'Reason is required' })}
          />
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="danger"
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Confirm rejection'}
            </Button>
            {rejectMutation.isError && (
              <span className="text-sm text-red-600">
                Failed to reject candidate. Please try again.
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
