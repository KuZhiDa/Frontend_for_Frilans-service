'use client'

import { useSearchParams, useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { API_URL } from '@/lib/api'
import { fetchWithAuth } from '@/lib/authFetch'

interface Project {
	id: number
	id_WorkInfo: number
	projectName: string
	urlGit: string
	description?: string
}

interface ErrorResponse {
	message?: string
}

export default function ProjectsPage() {
	const router = useRouter()
	const params = useParams()
	const [projects, setProjects] = useState<Project[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [isAdding, setIsAdding] = useState(false)
	const [saving, setSaving] = useState(false)
	const id_card = params.id_project as string
	const id_user_from_params = params.id as string

	const id_user_from_storage = localStorage.getItem('id_user')

	const isMyProfile =
		!id_user_from_params || id_user_from_params === id_user_from_storage

	const [formData, setFormData] = useState({
		projectName: '',
		urlGit: '',
		description: '',
	})

	useEffect(() => {
		const id_user = localStorage.getItem('id_user')

		if (!id_user) {
			router.push('/login')
			return
		}

		if (!id_card) return

		const fetchProjects = async () => {
			try {
				setLoading(true)
				setError(null)

				const res = await fetchWithAuth(`${API_URL}/api/work-info/project/${id_card}`, {
					method: 'GET',
				})
				const data = await res.json()

				if (!res.ok) throw new Error(data.message || 'Ошибка загрузки проектов')
				if (data.message) {
					setProjects([])
					return
				}
				setProjects(data)
			} catch (err: any) {
				setError(err.message)
			} finally {
				setLoading(false)
			}
		}

		fetchProjects()
	}, [router, id_card])

	const handleAddProject = async () => {
		if (!isMyProfile) return

		try {
			setSaving(true)

			const res = await fetchWithAuth(`${API_URL}/api/work-info/project/${id_card}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					id_WorkInfo: Number(id_card),
					...formData,
				}),
			})

			if (!res.ok) {
				const data: ErrorResponse = await res.json()
				throw new Error(data.message || 'Ошибка при добавлении проекта')
			}

			const newProject = await res.json()

			const addedProject: Project = {
				id: newProject.id,
				id_WorkInfo: Number(id_card),
				projectName: formData.projectName,
				urlGit: formData.urlGit,
				description: formData.description,
			}

			setProjects(prev => [...prev, addedProject])
			setFormData({ projectName: '', urlGit: '', description: '' })
			setIsAdding(false)
		} catch (err: any) {
			alert('Ошибка: ' + err.message)
		} finally {
			setSaving(false)
		}
	}

	const handleDeleteProject = async (id: number) => {
		if (!isMyProfile) return

		if (!confirm('Вы уверены, что хотите удалить проект?')) return
		try {
			const res = await fetchWithAuth(`${API_URL}/api/work-info/project/${id}`, {
				method: 'DELETE',
			})

			if (!res.ok) throw new Error('Ошибка при удалении проекта')
			setProjects(prev => prev.filter(p => p.id !== id))
		} catch (err: any) {
			alert('Ошибка: ' + err.message)
		}
	}

	const handleBack = () => {
		router.push(`/portfolio/${id_user_from_params}`)
	}

	if (loading)
		return (
			<div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200'>
				<p className='text-gray-600 text-lg'>Загрузка проектов...</p>
			</div>
		)

	if (error)
		return (
			<div className='flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200'>
				<p className='text-red-600 mb-4 text-lg'>Ошибка: {error}</p>
				<button
					onClick={handleBack}
					className='bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition'
				>
					Назад
				</button>
			</div>
		)

	return (
		<div className='min-h-screen w-full bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200 flex flex-col items-center py-12'>
			<div className='w-full max-w-6xl bg-white/70 backdrop-blur-md shadow-xl rounded-3xl p-10 flex flex-col items-center'>
				<div className='flex justify-between items-center w-full mb-6'>
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
						Проекты
					</h1>
					<div className='w-24'></div>
				</div>

				<div className='w-full overflow-x-auto'>
					<table className='min-w-full table-auto border-collapse border border-gray-300'>
						<thead className='bg-blue-100'>
							<tr>
								<th className='px-4 py-2 border'>Название</th>
								<th className='px-4 py-2 border'>Ссылка</th>
								<th className='px-4 py-2 border'>Описание</th>
								{isMyProfile && (
									<th className='px-4 py-2 border text-right'>Действия</th>
								)}
							</tr>
						</thead>
						<tbody>
							{projects.length > 0 &&
								projects.map(project => (
									<tr
										key={project.id}
										className='hover:bg-blue-50 transition-colors'
									>
										<td className='px-4 py-2 border'>{project.projectName}</td>
										<td className='px-4 py-2 border'>
											{project.urlGit ? (
												<a
													href={project.urlGit}
													target='_blank'
													rel='noopener noreferrer'
													className='text-blue-600 underline hover:text-blue-800'
												>
													Ссылка
												</a>
											) : (
												'—'
											)}
										</td>
										<td className='px-4 py-2 border'>{project.description}</td>
										{isMyProfile && (
											<td className='px-4 py-2 border text-right'>
												<button
													onClick={() => handleDeleteProject(project.id)}
													className='bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition'
												>
													Удалить
												</button>
											</td>
										)}
									</tr>
								))}

							{projects.length === 0 && !isAdding && (
								<tr>
									<td
										className='px-4 py-2 border text-center'
										colSpan={isMyProfile ? 4 : 3}
									>
										Проектов пока нет
									</td>
								</tr>
							)}

							{isAdding && isMyProfile && (
								<tr className='bg-yellow-50'>
									<td className='px-4 py-2 border'>
										<input
											type='text'
											value={formData.projectName}
											onChange={e =>
												setFormData({
													...formData,
													projectName: e.target.value,
												})
											}
											className='w-full border rounded px-2 py-1'
										/>
									</td>
									<td className='px-4 py-2 border'>
										<input
											type='text'
											value={formData.urlGit}
											onChange={e =>
												setFormData({ ...formData, urlGit: e.target.value })
											}
											className='w-full border rounded px-2 py-1'
										/>
									</td>
									<td className='px-4 py-2 border'>
										<input
											type='text'
											value={formData.description}
											onChange={e =>
												setFormData({
													...formData,
													description: e.target.value,
												})
											}
											className='w-full border rounded px-2 py-1'
										/>
									</td>
									<td className='px-4 py-2 border text-right flex gap-2 justify-end'>
										<button
											onClick={handleAddProject}
											className='bg-green-500 text-white px-3 py-1 rounded'
											disabled={saving}
										>
											Сохранить
										</button>
										<button
											onClick={() => setIsAdding(false)}
											className='bg-gray-500 text-white px-3 py-1 rounded'
										>
											Отмена
										</button>
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{!isAdding && isMyProfile && (
					<button
						onClick={() => setIsAdding(true)}
						className='mt-6 bg-blue-500 text-white px-6 py-3 rounded-xl hover:bg-blue-600 transition shadow-md'
					>
						Добавить проект
					</button>
				)}
			</div>
		</div>
	)
}
