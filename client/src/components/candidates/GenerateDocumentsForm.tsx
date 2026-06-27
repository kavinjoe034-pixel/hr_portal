import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Download, Loader2 } from 'lucide-react'
import api, { API_BASE_URL } from '../../lib/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface GenerateDocumentsFormProps {
  candidateId: string
  onSuccess?: () => void
}

interface DocumentFormData {
  roleTitle: string
  salaryCurrency: string
  salaryAmount: string
  startDate: string
  reportingManager: string
  location: string
}

interface DocumentResponse {
  offerUrl: string
  ndaUrl: string
}

const generateDocuments = async (
  candidateId: string,
  data: DocumentFormData,
): Promise<DocumentResponse> => {
  const response = await api.post(`/documents/candidates/${candidateId}`, {
    roleTitle: data.roleTitle,
    salaryCurrency: data.salaryCurrency,
    salaryAmount: Number(data.salaryAmount),
    startDate: data.startDate,
    reportingManager: data.reportingManager,
    location: data.location,
  })
  return response.data
}

export default function GenerateDocumentsForm({
  candidateId,
  onSuccess,
}: GenerateDocumentsFormProps) {
  const queryClient = useQueryClient()
  const [generatedDocs, setGeneratedDocs] = useState<DocumentResponse | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DocumentFormData>({
    defaultValues: {
      roleTitle: '',
      salaryCurrency: 'USD',
      salaryAmount: '',
      startDate: '',
      reportingManager: '',
      location: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: DocumentFormData) => generateDocuments(candidateId, data),
    onSuccess: (data) => {
      setGeneratedDocs(data)
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] })
      if (onSuccess) {
        onSuccess()
      }
    },
  })

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4"
        aria-label="Generate offer documents"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Role title"
            placeholder="e.g. Senior Backend Engineer"
            error={errors.roleTitle?.message}
            {...register('roleTitle', { required: 'Role title is required' })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Currency"
              placeholder="USD"
              error={errors.salaryCurrency?.message}
              {...register('salaryCurrency', { required: 'Currency is required' })}
            />
            <Input
              label="Annual salary"
              type="number"
              placeholder="150000"
              error={errors.salaryAmount?.message}
              {...register('salaryAmount', {
                required: 'Salary is required',
                min: { value: 0, message: 'Salary must be positive' },
              })}
            />
          </div>
          <Input
            label="Start date"
            type="date"
            error={errors.startDate?.message}
            {...register('startDate', { required: 'Start date is required' })}
          />
          <Input
            label="Reporting manager"
            placeholder="e.g. Jane Doe"
            error={errors.reportingManager?.message}
            {...register('reportingManager', { required: 'Reporting manager is required' })}
          />
          <Input
            label="Location"
            placeholder="e.g. Remote"
            error={errors.location?.message}
            {...register('location', { required: 'Location is required' })}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            disabled={mutation.isPending}
            className="flex items-center gap-2"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {mutation.isPending ? 'Generating...' : 'Generate Offer & NDA'}
          </Button>
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-600">
            Failed to generate documents. Candidate must have an interview scheduled.
          </p>
        )}
      </form>

      {generatedDocs && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="mb-2 text-sm font-medium text-green-800">Documents generated successfully</p>
          <div className="flex flex-wrap gap-3">
            <a
              href={`${API_BASE_URL}${generatedDocs.offerUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
            >
              <Download className="h-4 w-4" />
              Download offer letter
            </a>
            <a
              href={`${API_BASE_URL}${generatedDocs.ndaUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
            >
              <Download className="h-4 w-4" />
              Download NDA
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
