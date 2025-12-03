'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getAvatarUrl, UserData, API_URL } from '@/lib/api'
import { clearUserData } from '@/lib/storage'
import { fetchWithAuth } from '@/lib/authFetch'

export default function DashboardPage() {
	const router = useRouter()
	const paramIdUser = useParams().id as string

	const [user, setUser] = useState<UserData | null>(null)
	const [avatarUrl, setAvatarUrl] = useState<string>('/default-avatar.jpg')
	const [projects, setProjects] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [uploading, setUploading] = useState(false)
	const [roleUser, setRoleUser] = useState<string | null>(null)
	const [canUploadAvatar, setCanUploadAvatar] = useState(false)
	const [selectedProject, setSelectedProject] = useState<any | null>(null)
	const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)
	const [isRatingModalOpen, setIsRatingModalOpen] = useState(false)
	const [rating, setRating] = useState(0)
	const [hoveredRating, setHoveredRating] = useState(0)
	const [submittingRating, setSubmittingRating] = useState(false)
	const [projectActionLoading, setProjectActionLoading] = useState(false)
	const [isResumeModalOpen, setIsResumeModalOpen] = useState(false)
	const [resumeDeadline, setResumeDeadline] = useState('')
	const [resumeSubmitting, setResumeSubmitting] = useState(false)

	const id_user_from_storage =
		typeof window !== 'undefined' ? localStorage.getItem('id_user') : null
	const isMyProfile = !paramIdUser || paramIdUser === id_user_from_storage
	const profileId = paramIdUser || id_user_from_storage
	const activeProjectsColSpan =
		4 + (roleUser !== 'C' ? 1 : 0) + (roleUser !== 'E' ? 1 : 0)

	const handleLogout = async () => {
		clearUserData()
		router.push('/login')
	}

	const handleSearchProjects = () => {
		router.push('/found-projects')
	}

	const handleBack = () => {
		router.push(`/dashboard/${id_user_from_storage}`)
	}

	const fetchUserProjectsWithAuth = async (id: string) => {
		const role = localStorage.getItem('role_user')
		const queryParam = role === 'E' ? 'executorId' : 'customerId'
		const res = await fetchWithAuth(
			`${API_URL}/api/project?${queryParam}=${id}`
		)
		return res.json()
	}

	useEffect(() => {
		const token = localStorage.getItem('access_token')
		const localIdUser = localStorage.getItem('id_user')
		const role = localStorage.getItem('role_user')

		if (!token || !localIdUser) {
			router.push('/login')
			return
		}

		setRoleUser(role)
		setCanUploadAvatar(paramIdUser === localIdUser)

		const loadData = async () => {
			try {
				setLoading(true)
				setError(null)
				const idToFetch = paramIdUser || localIdUser

				const [userData, projectsData] = await Promise.all([
					fetchUserDataWithAuth(idToFetch),
					fetchUserProjectsWithAuth(idToFetch),
				])

				setUser(userData)
				setProjects(projectsData)
				setAvatarUrl(getAvatarUrl(userData))
			} catch (err: any) {
				setError(err.message)
			} finally {
				setLoading(false)
			}
		}

		const fetchUserDataWithAuth = async (id: string): Promise<UserData> => {
			const res = await fetchWithAuth(`${API_URL}/api/users/info/${id}`)
			const json = await res.json()

			if (!json.resultData) {
				throw new Error('Некорректный формат ответа от сервера')
			}

			return {
				id_user: parseInt(id),
				username: json.resultData.username || 'Не указано',
				email: json.resultData.email || 'Не указано',
				phone_number: json.resultData.phone_number || 'Не указано',
				rating: json.resultData.rating || 0,
				avatar_name: json.imageInfo?.avatar_name || null,
			}
		}

		loadData()
	}, [router, paramIdUser])

	const handleAvatarUpload = async (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		if (!canUploadAvatar) return
		const file = event.target.files?.[0]
		if (!file) return

		try {
			setUploading(true)

			const formData = new FormData()
			formData.append('avatar', file)

			const res = await fetchWithAuth(`${API_URL}/api/image/add`, {
				method: 'POST',
				body: formData,
			})

			const result = await res.json()
			if (result.avatar_name && user) {
				const updatedUser = { ...user, avatar_name: result.avatar_name }
				setUser(updatedUser)
				setAvatarUrl(getAvatarUrl(updatedUser))
			}
			alert('Аватар успешно обновлен!')
		} catch (err: any) {
			alert('Ошибка при загрузке аватара: ' + err.message)
		} finally {
			setUploading(false)
		}
	}

	const handleAvatarClick = () => {
		if (!canUploadAvatar) return
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = 'image/*'
		input.onchange = (e: Event) => {
			const target = e.target as HTMLInputElement
			if (target.files && target.files[0]) {
				const changeEvent = {
					target: { files: target.files },
				} as React.ChangeEvent<HTMLInputElement>
				handleAvatarUpload(changeEvent)
			}
		}
		input.click()
	}

	const handleProjectClick = (project: any) => {
		if (roleUser !== 'C' || !isMyProfile) return
		if (project.status === 'В процессе') {
			setSelectedProject(project)
			setIsCompleteModalOpen(true)
			return
		}
		if (project.status === 'Приостановлен') {
			setSelectedProject(project)
			setResumeDeadline(project.deadlineDate || '')
			setIsResumeModalOpen(true)
		}
	}

	const handleCompleteProject = () => {
		setIsCompleteModalOpen(false)
		setIsRatingModalOpen(true)
		setRating(0)
		setHoveredRating(0)
	}

	const handleSubmitRating = async () => {
		if (!selectedProject || rating === 0) {
			alert('Пожалуйста, выберите оценку')
			return
		}

		try {
			setSubmittingRating(true)
			const res = await fetchWithAuth(
				`${API_URL}/api/project?projectId=${selectedProject.id}`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ rating }),
				}
			)

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}))
				throw new Error(errorData.message || 'Ошибка при оценке проекта')
			}

			const idToFetch = paramIdUser || id_user_from_storage
			if (idToFetch) {
				const projectsData = await fetchUserProjectsWithAuth(idToFetch)
				setProjects(projectsData)
			}

			setIsRatingModalOpen(false)
			setSelectedProject(null)
			setRating(0)
			alert('Проект успешно завершен и оценен!')
		} catch (err: any) {
			alert(err.message || 'Ошибка при оценке проекта')
		} finally {
			setSubmittingRating(false)
		}
	}

	const handleSuspendProject = async () => {
		if (!selectedProject) return
		try {
			setProjectActionLoading(true)
			const res = await fetchWithAuth(
				`${API_URL}/api/project?projectId=${selectedProject.id}`,
				{ method: 'PATCH' }
			)
			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}))
				throw new Error(errorData.message || 'Ошибка приостановки проекта')
			}
			const idToFetch = profileId
			if (idToFetch) {
				const projectsData = await fetchUserProjectsWithAuth(idToFetch)
				setProjects(projectsData)
			}
			setIsCompleteModalOpen(false)
			setSelectedProject(null)
			alert('Проект приостановлен')
		} catch (err: any) {
			alert(err.message || 'Ошибка приостановки проекта')
		} finally {
			setProjectActionLoading(false)
		}
	}

	const handleOpenArchive = () => {
		if (!profileId) return
		router.push(`/dashboard/${profileId}/archive`)
	}

	const handleResumeProject = async () => {
		if (!selectedProject) return
		if (!resumeDeadline) {
			alert('Пожалуйста, укажите новый дедлайн')
			return
		}
		try {
			setResumeSubmitting(true)
			const res = await fetchWithAuth(
				`${API_URL}/api/project?projectId=${selectedProject.id}`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ deadlineDate: resumeDeadline }),
				}
			)
			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}))
				throw new Error(errorData.message || 'Ошибка продолжения проекта')
			}
			if (profileId) {
				const projectsData = await fetchUserProjectsWithAuth(profileId)
				setProjects(projectsData)
			}
			setIsResumeModalOpen(false)
			setSelectedProject(null)
			setResumeDeadline('')
			alert('Проект продолжен')
		} catch (err: any) {
			alert(err.message || 'Ошибка продолжения проекта')
		} finally {
			setResumeSubmitting(false)
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
			<div className='flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200'>
				<p className='text-red-600 mb-4 text-lg'>Ошибка: {error}</p>
				<button
					onClick={() => location.reload()}
					className='bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition'
				>
					Повторить
				</button>
			</div>
		)

	if (!user)
		return (
			<div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200'>
				<p className='text-gray-500'>Нет данных пользователя</p>
			</div>
		)

	return (
		<div className='min-h-screen w-full bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200 flex flex-col items-center py-12'>
			<div className='w-full max-w-6xl bg-white/70 backdrop-blur-md shadow-xl rounded-3xl p-10 space-y-10'>
				<div className='flex justify-between items-center mb-6'>
					{roleUser === 'E' && isMyProfile ? (
						<button
							onClick={handleSearchProjects}
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
									d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
								/>
							</svg>
							Поиск проектов
						</button>
					) : !isMyProfile ? (
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
					) : (
						<div></div>
					)}

					<h1 className='text-3xl font-semibold text-blue-700 text-center flex-1'>
						{roleUser === 'E' || !isMyProfile
							? 'Личный кабинет исполнителя'
							: 'Личный кабинет заказчика'}
					</h1>
					{isMyProfile && (
						<button
							onClick={handleLogout}
							className='flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors text-lg font-medium'
						>
							Выход
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
									d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
								/>
							</svg>
						</button>
					)}
				</div>

				<section className='border-b border-gray-200 pb-8'>
					<div className='flex flex-col lg:flex-row items-center justify-between gap-8'>
						<div className='flex flex-col lg:flex-row items-center gap-6 lg:gap-8 lg:flex-1 lg:justify-center'>
							<div className='relative flex-shrink-0'>
								<img
									key={avatarUrl}
									src={avatarUrl}
									alt='User Avatar'
									className={`w-32 h-32 rounded-full object-cover border-4 border-gray-200 cursor-pointer ${
										isMyProfile ? 'hover:opacity-80' : 'hover'
									} transition`}
									onClick={handleAvatarClick}
								/>
								{uploading && (
									<div className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full'>
										<div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white'></div>
									</div>
								)}
							</div>

							<div className='text-gray-700 space-y-2 text-center lg:text-left'>
								<p className='text-xl font-bold text-gray-900 mb-2'>
									{user.username}
								</p>
								<p>
									<span className='font-semibold text-gray-900'>Email:</span>{' '}
									{user.email || 'Не указан'}
								</p>
								<p>
									<span className='font-semibold text-gray-900'>Телефон:</span>{' '}
									{user.phone_number || 'Не указан'}
								</p>
							</div>
						</div>

						<div className='flex justify-center lg:flex-1'>
							{roleUser === 'E' || !isMyProfile ? (
								<div className='flex flex-col sm:flex-row gap-4 justify-center'>
									<button
										onClick={() =>
											router.push(
												`/profile/${paramIdUser || id_user_from_storage}`
											)
										}
										className='bg-green-500 text-white px-8 py-3 rounded-xl text-lg font-semibold shadow-md hover:bg-green-600 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300'
									>
										Информация об исполнителе
									</button>
									<button
										onClick={() =>
											router.push(
												`/portfolio/${paramIdUser || id_user_from_storage}`
											)
										}
										className='bg-blue-600 text-white px-8 py-3 rounded-xl text-lg font-semibold shadow-md hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300'
									>
										Профессиональная информация
									</button>
								</div>
							) : (
								<button
									onClick={() => router.push(`/posts`)}
									className='bg-green-500 text-white px-12 py-4 rounded-xl text-lg font-semibold shadow-md hover:bg-green-600 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300'
								>
									Посты
								</button>
							)}
						</div>
					</div>
				</section>

				{isMyProfile && (
					<section className='border-b border-gray-200 pb-8'>
						<div className='flex items-center justify-between mb-6 gap-4'>
							<h2 className='text-2xl font-semibold text-gray-800'>
								Активные проекты
							</h2>
							{isMyProfile && (
								<button
									onClick={handleOpenArchive}
									className='bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-blue-50 transition'
								>
									Архив
								</button>
							)}
						</div>
						<div className='overflow-x-auto rounded-lg'>
							<table className='min-w-full border border-gray-200 text-left bg-white rounded-lg'>
								<thead className='bg-gray-100'>
									<tr>
										<th className='p-3 border-b'>Название</th>
										{roleUser !== 'C' && (
											<th className='p-3 border-b'>Заказчик</th>
										)}
										{roleUser !== 'E' && (
											<th className='p-3 border-b'>Исполнитель</th>
										)}
										<th className='p-3 border-b'>Статус</th>
										<th className='p-3 border-b'>Дедлайн</th>
										<th className='p-3 border-b'>Цена</th>
									</tr>
								</thead>
								<tbody>
									{projects.map(p => (
										<tr
											key={p.id}
											onClick={() => handleProjectClick(p)}
											className={`hover:bg-gray-50 ${
												roleUser === 'C' && isMyProfile ? 'cursor-pointer' : ''
											}`}
										>
											<td className='p-3 border-b'>{p.projectName}</td>
											{roleUser !== 'C' && (
												<td className='p-3 border-b'>{p.usernameCustomer}</td>
											)}
											{roleUser !== 'E' && (
												<td className='p-3 border-b'>{p.usernameExecutor}</td>
											)}
											<td className='p-3 border-b'>{p.status}</td>
											<td className='p-3 border-b'>{p.deadlineDate}</td>
											<td className='p-3 border-b'>{p.price}</td>
										</tr>
									))}
									{projects.length === 0 && (
										<tr>
											<td
												className='p-4 text-center text-gray-500'
												colSpan={activeProjectsColSpan}
											>
												Активные проекты отсутствуют
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</section>
				)}

				{(roleUser === 'E' || !isMyProfile) && (
					<section className='flex flex-col items-center text-center'>
						<h2 className='text-2xl font-semibold mb-3 text-gray-800'>
							Рейтинг пользователя
						</h2>
						<div className='flex items-center space-x-1 mb-2'>
							{[1, 2, 3, 4, 5].map(i => (
								<span
									key={i}
									className={`text-3xl ${
										i <= Math.round(user.rating)
											? 'text-yellow-400'
											: 'text-gray-300'
									}`}
								>
									★
								</span>
							))}
						</div>
						<p className='text-gray-600 text-sm'>
							{user.rating?.toFixed(1) || 0} из 5.0
						</p>
					</section>
				)}
			</div>

			{isCompleteModalOpen && selectedProject && (
				<div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'>
					<div className='bg-white rounded-2xl p-6 w-full max-w-md shadow-xl'>
						<h2 className='text-2xl font-semibold text-blue-700 mb-4'>
							Завершение проекта
						</h2>

						<div className='mb-4'>
							<p className='font-medium mb-2'>Название проекта:</p>
							<p className='text-gray-700'>{selectedProject.projectName}</p>
						</div>

						<div className='mb-4'>
							<p className='font-medium mb-2'>Исполнитель:</p>
							<p className='text-gray-700'>
								{selectedProject.usernameExecutor}
							</p>
						</div>

						<div className='flex justify-end gap-3 flex-wrap'>
							<button
								onClick={handleSuspendProject}
								className='px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition disabled:opacity-50'
								disabled={projectActionLoading}
							>
								Приостановить
							</button>
							<button
								onClick={handleCompleteProject}
								className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50'
								disabled={projectActionLoading}
							>
								Завершить
							</button>
							<button
								onClick={() => {
									setIsCompleteModalOpen(false)
									setSelectedProject(null)
								}}
								className='px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition'
							>
								Отмена
							</button>
						</div>
					</div>
				</div>
			)}

			{isRatingModalOpen && selectedProject && (
				<div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'>
					<div className='bg-white rounded-2xl p-6 w-full max-w-md shadow-xl'>
						<h2 className='text-2xl font-semibold text-blue-700 mb-4'>
							Оцените работу
						</h2>

						<div className='mb-6'>
							<p className='text-gray-600 mb-4'>
								Проект:{' '}
								<span className='font-medium'>
									{selectedProject.projectName}
								</span>
							</p>
							<p className='text-gray-600 mb-4'>
								Исполнитель:{' '}
								<span className='font-medium'>
									{selectedProject.usernameExecutor}
								</span>
							</p>

							<div className='flex items-center justify-center gap-2 mb-4'>
								{[1, 2, 3, 4, 5].map(star => (
									<button
										key={star}
										type='button'
										onClick={() => setRating(star)}
										onMouseEnter={() => setHoveredRating(star)}
										onMouseLeave={() => setHoveredRating(0)}
										className='text-5xl transition-transform hover:scale-110 focus:outline-none'
									>
										<span
											className={
												star <= (hoveredRating || rating)
													? 'text-yellow-400'
													: 'text-gray-300'
											}
										>
											★
										</span>
									</button>
								))}
							</div>
							{rating > 0 && (
								<p className='text-center text-gray-600'>
									Вы оценили на {rating}{' '}
									{rating === 1 ? 'звезду' : rating < 5 ? 'звезды' : 'звезд'}
								</p>
							)}
						</div>

						<div className='flex justify-end gap-3'>
							<button
								onClick={handleSubmitRating}
								disabled={submittingRating || rating === 0}
								className='px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed'
							>
								{submittingRating ? 'Отправка...' : 'Отправить оценку'}
							</button>
							<button
								onClick={() => {
									setIsRatingModalOpen(false)
									setSelectedProject(null)
									setRating(0)
									setHoveredRating(0)
								}}
								disabled={submittingRating}
								className='px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50'
							>
								Отмена
							</button>
						</div>
					</div>
				</div>
			)}

			{isResumeModalOpen && selectedProject && (
				<div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'>
					<div className='bg-white rounded-2xl p-6 w-full max-w-md shadow-xl'>
						<h2 className='text-2xl font-semibold text-blue-700 mb-4'>
							Продолжение проекта
						</h2>
						<div className='mb-4'>
							<p className='font-medium mb-2'>Название проекта:</p>
							<p className='text-gray-700'>{selectedProject.projectName}</p>
						</div>
						<div className='mb-6'>
							<label
								className='block text-gray-600 mb-2'
								htmlFor='resume-deadline'
							>
								Новый дедлайн
							</label>
							<input
								id='resume-deadline'
								type='date'
								value={resumeDeadline}
								onChange={e => setResumeDeadline(e.target.value)}
								className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
							/>
						</div>
						<div className='flex justify-end gap-3 flex-wrap'>
							<button
								onClick={() => {
									setIsResumeModalOpen(false)
									setSelectedProject(null)
									setResumeDeadline('')
								}}
								className='px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50'
								disabled={resumeSubmitting}
							>
								Отмена
							</button>
							<button
								onClick={handleResumeProject}
								disabled={resumeSubmitting || !resumeDeadline}
								className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50'
							>
								{resumeSubmitting ? 'Сохранение...' : 'Продолжить'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
