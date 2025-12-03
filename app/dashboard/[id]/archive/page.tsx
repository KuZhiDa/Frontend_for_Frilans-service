'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { API_URL } from '@/lib/api'
import { fetchWithAuth } from '@/lib/authFetch'

export default function ArchiveProjectsPage() {
	const router = useRouter()
	const { id } = useParams()

	const [projects, setProjects] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [roleUser, setRoleUser] = useState<string | null>(null)
	const [isMyProfile, setIsMyProfile] = useState(false)

	useEffect(() => {
		const token = localStorage.getItem('access_token')
		const localIdUser = localStorage.getItem('id_user')
		const role = localStorage.getItem('role_user')

		if (!token || !localIdUser) {
			router.push('/login')
			return
		}

		setRoleUser(role)
		const targetId = (id as string) || localIdUser
		setIsMyProfile(targetId === localIdUser)

		const loadProjects = async () => {
			try {
				setLoading(true)
				setError(null)
				const roleFromStorage = localStorage.getItem('role_user')
				const queryParam = roleFromStorage === 'E' ? 'executorId' : 'customerId'
				const res = await fetchWithAuth(
					`${API_URL}/api/project?${queryParam}=${targetId}&status=Завершен`
				)
				const data = await res.json()
				setProjects(data || [])
			} catch (err: any) {
				setError(err.message || 'Ошибка загрузки архива')
			} finally {
				setLoading(false)
			}
		}

		loadProjects()
	}, [router, id])

	const handleBack = () => {
		const localId = localStorage.getItem('id_user')
		const destinationId = (id as string) || localId
		if (destinationId) {
			router.push(`/dashboard/${destinationId}`)
		}
	}

	if (loading)
		return (
			<div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200'>
				<p className='text-gray-600 text-lg'>Загрузка данных...</p>
			</div>
		)

	if (error)
		return (
			<div className='flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200 space-y-4'>
				<p className='text-red-600 text-lg'>{error}</p>
				<button
					onClick={() => location.reload()}
					className='bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition'
				>
					Повторить
				</button>
			</div>
		)

	return (
		<div className='min-h-screen w-full bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200 flex flex-col items-center py-12'>
			<div className='w-full max-w-6xl bg-white/70 backdrop-blur-md shadow-xl rounded-3xl p-10 space-y-10'>
				<div className='flex justify-between items-center'>
					<button
						onClick={handleBack}
						className='flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors text-lg font-medium'
					>
						<svg
							className='w-5 h-5'
							fill='none'
							stroke='currentColor'
							viewBox='0 0 24 24'
						>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth={2}
								d='M10 19l-7-7m0 0l7-7m-7 7h18'
							/>
						</svg>
						Назад
					</button>
					<h1 className='text-3xl font-semibold text-blue-700 text-center flex-1'>
						Архив проектов
					</h1>
					<div className='w-20' />
				</div>

				<section>
					<div className='overflow-x-auto rounded-lg'>
						<table className='min-w-full border border-gray-200 text-left bg-white rounded-lg'>
							<thead className='bg-gray-100'>
								<tr>
									<th className='p-3 border-b'>Название</th>
									{roleUser !== 'C' && <th className='p-3 border-b'>Заказчик</th>}
									{roleUser !== 'E' && <th className='p-3 border-b'>Исполнитель</th>}
									<th className='p-3 border-b'>Цена</th>
								</tr>
							</thead>
							<tbody>
								{projects.length === 0 && (
									<tr>
										<td className='p-4 text-center text-gray-500' colSpan={roleUser === 'C' || roleUser === 'E' ? 3 : 4}>
											Завершенные проекты отсутствуют
										</td>
									</tr>
								)}
								{projects.map(project => (
									<tr key={project.id} className='hover:bg-gray-50'>
										<td className='p-3 border-b'>{project.projectName}</td>
										{roleUser !== 'C' && (
											<td className='p-3 border-b'>{project.usernameCustomer}</td>
										)}
										{roleUser !== 'E' && (
											<td className='p-3 border-b'>{project.usernameExecutor}</td>
										)}
										<td className='p-3 border-b'>{project.price}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			</div>
		</div>
	)
}
