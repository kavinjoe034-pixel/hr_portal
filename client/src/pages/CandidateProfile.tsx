import { useParams } from 'react-router-dom'

export default function CandidateProfile() {
  const { id } = useParams<{ id: string }>()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Candidate Profile</h1>
      <p className="text-gray-500">Candidate ID: {id}</p>
    </div>
  )
}
