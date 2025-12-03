'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { API_URL } from '@/lib/api'
import { fetchWithAuth } from '@/lib/authFetch'

interface PostCard {
	id: number
	projectName: string
	description: string
	price: number
}

interface ErrorResponse {
	message?: string
}

export default function PostsPage() {
	const router = useRouter()
	const [posts, setPosts] = useState<PostCard[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [isCreating, setIsCreating] = useState(false)
	const [saving, setSaving] = useState(false)
	const [formData, setFormData] = useState({
		projectName: '',
		description: '',
		price: '',
	})

	const [editingPost, setEditingPost] = useState<PostCard | null>(null)
	const [showEmailModal, setShowEmailModal] = useState(false)
	const [resendingEmail, setResendingEmail] = useState(false)
	const [emailError, setEmailError] = useState<string | null>(null)
	const [userId, setUserId] = useState<string | null>(null)

	const sendVerificationEmail = async () => {
		try {
			setResendingEmail(true)
			setEmailError(null)
			const id_user = localStorage.getItem('id_user')
			const accessToken = localStorage.getItem('access_token')

			if (!id_user || !accessToken) {
				setEmailError('Требуется авторизация')
				return
			}

			const response = await fetchWithAuth(`${API_URL}/api/email/send/${id_user}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
			})

			if (!response.ok) {
				const data = await response.json()
				throw new Error(data.message || 'Ошибка при отправке письма')
			}
		} catch (err: any) {
			setEmailError('Ошибка при отправке письма: ' + err.message)
		} finally {
			setResendingEmail(false)
		}
	}

	useEffect(() => {
		const token = localStorage.getItem('access_token')
		const id_user = localStorage.getItem('id_user')
		setUserId(id_user)
		if (!token || !id_user) {
			router.push('/login')
			return
		}


		const loadPosts = async () => {
			try {
				setLoading(true)
				setError(null)
				const res = await fetchWithAuth(
					`${API_URL}/api/post/customer/${id_user}`
				)

				const data: PostCard[] = await res.json()
				setPosts(data)
			} catch (err: any) {
				if (
					err.message
						.toLowerCase()
						.includes('почта пользователя не подтверждена')
				) {
					setShowEmailModal(true)
					sendVerificationEmail()
				} else {
					setError(err.message)
				}
			} finally {
				setLoading(false)
			}
		}

		loadPosts()
	}, [router])

	const handleCreatePost = async () => {
		try {
			setSaving(true)
			const id_user = localStorage.getItem('id_user')

			const res = await fetchWithAuth(`${API_URL}/api/post/customer/${id_user}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					projectName: formData.projectName,
					description: formData.description,
					price: Number(formData.price),
				}),
			})

			if (!res.ok) {
				const data: ErrorResponse = await res.json()
				throw new Error(data.message || 'Ошибка при создании поста')
			}

			const { id } = await res.json()

			setPosts(prev => [
				...prev,
				{
					id,
					projectName: formData.projectName,
					description: formData.description,
					price: Number(formData.price),
				},
			])

			setIsCreating(false)
			setFormData({
				projectName: '',
				description: '',
				price: '',
			})
		} catch (err: any) {
			alert('Ошибка: ' + err.message)
		} finally {
			setSaving(false)
		}
	}

	const handleUpdatePost = async () => {
		if (!editingPost) return

		try {
			setSaving(true)

			const res = await fetchWithAuth(
				`${API_URL}/api/post/customer/${editingPost.id}`,
				{
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						projectName: editingPost.projectName,
						description: editingPost.description,
						price: editingPost.price,
					}),
				}
			)

			if (!res.ok) {
				const data = await res.json()
				throw new Error(data.message || 'Ошибка обновления')
			}

			setPosts(prev =>
				prev.map(p => (p.id === editingPost.id ? editingPost : p))
			)

			setEditingPost(null)
		} catch (err: any) {
			alert('Ошибка: ' + err.message)
		} finally {
			setSaving(false)
		}
	}

	const handleDeletePost = async (id: number) => {
		if (!confirm('Удалить пост?')) return

		try {
			const res = await fetchWithAuth(`${API_URL}/api/post/customer/${id}`, {
				method: 'DELETE',
			})

			if (!res.ok) {
				const data = await res.json()
				throw new Error(data.message || 'Ошибка удаления')
			}

			setPosts(prev => prev.filter(p => p.id !== id))
		} catch (err: any) {
			alert('Ошибка: ' + err.message)
		}
	}

	if (loading)
		return (
			<div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200'>
				<p className='text-gray-600 text-lg'>Загрузка постов...</p>
			</div>
		)

	if (error)
		return (
			<div className='flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200'>
				<p className='text-red-600 mb-4 text-lg'>Ошибка: {error}</p>
				<button
					onClick={() => router.push(`/dashboard/${userId}`)}
					className='bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition'
				>
					Назад в кабинет
				</button>
			</div>
		)

	return (
		<div className='min-h-screen w-full bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200 flex flex-col items-center py-12'>
			{showEmailModal && (
				<div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
					<div className='bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center'>
						<h2 className='text-2xl font-semibold text-gray-800'>
							Email не подтверждён
						</h2>
						<p className='text-gray-600 my-4'>
							{resendingEmail
								? 'Отправляем письмо...'
								: 'На вашу почту отправлено письмо. После подтверждения обновите страницу.'}
						</p>

						{emailError && (
							<p className='text-red-600 text-sm mb-4'>{emailError}</p>
						)}

						<button
							onClick={() => router.push(`/dashboard/${userId}`)}
							className='bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition'
						>
							Вернуться в кабинет
						</button>
					</div>
				</div>
			)}

			<div
				className={`w-full max-w-5xl bg-white/70 backdrop-blur-md shadow-xl rounded-3xl p-10 flex flex-col items-center ${
					showEmailModal 					? 'pointer-events-none opacity-50' : ''
				}`}
			>
				<div className='flex justify-between items-center w-full mb-6'>
					<button
						onClick={() => router.push(`/dashboard/${userId}`)}
						className='flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors text-lg font-medium'
					>
						<svg
							className='w-5 h-5'
							fill='none'
							shapeRendering='geometricPrecision'
							stroke='currentColor'
							strokeWidth='2'
							viewBox='0 0 24 24'
						>
							<path d='M10 19l-7-7m0 0l7-7m-7 7h18' />
						</svg>
						Назад
					</button>
					<h1 className='text-3xl font-semibold text-blue-700 text-center flex-1'>
						Посты
					</h1>
					<div className='w-24'></div>
				</div>

				{isCreating ? (
					<div className='space-y-6 w-full'>
						<h2 className='text-2xl font-semibold text-gray-800'>
							Создание поста
						</h2>

						<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-2'>
									Название проекта
								</label>
								<input
									type='text'
									value={formData.projectName}
									onChange={e =>
										setFormData({ ...formData, projectName: e.target.value })
									}
									className='w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500'
								/>
							</div>

							<div>
								<label className='block text-sm font-medium text-gray-700 mb-2'>
									Цена
								</label>
								<input
									type='number'
									value={formData.price}
									onChange={e =>
										setFormData({ ...formData, price: e.target.value })
									}
									className='w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500'
								/>
							</div>

							<div className='md:col-span-2'>
								<label className='block text-sm font-medium text-gray-700 mb-2'>
									Описание
								</label>
								<textarea
									value={formData.description}
									onChange={e =>
										setFormData({ ...formData, description: e.target.value })
									}
									rows={4}
									className='w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500'
								/>
							</div>
						</div>

						<div className='flex justify-end gap-4 mt-4'>
							<button
								onClick={() => setIsCreating(false)}
								className='bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition'
							>
								Отмена
							</button>
							<button
								onClick={handleCreatePost}
								disabled={saving}
								className='bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition'
							>
								{saving ? 'Сохранение...' : 'Сохранить'}
							</button>
						</div>
					</div>
				) : editingPost ? (
					<div className='space-y-6 w-full'>
						<h2 className='text-2xl font-semibold text-gray-800'>
							Редактирование поста
						</h2>

						<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-2'>
									Название проекта
								</label>
								<input
									type='text'
									value={editingPost.projectName}
									onChange={e =>
										setEditingPost({
											...editingPost,
											projectName: e.target.value,
										})
									}
									className='w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500'
								/>
							</div>

							<div>
								<label className='block text-sm font-medium text-gray-700 mb-2'>
									Цена
								</label>
								<input
									type='number'
									value={editingPost.price}
									onChange={e =>
										setEditingPost({
											...editingPost,
											price: Number(e.target.value),
										})
									}
									className='w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500'
								/>
							</div>

							<div className='md:col-span-2'>
								<label className='block text-sm font-medium text-gray-700 mb-2'>
									Описание
								</label>
								<textarea
									value={editingPost.description}
									onChange={e =>
										setEditingPost({
											...editingPost,
											description: e.target.value,
										})
									}
									rows={4}
									className='w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500'
								/>
							</div>
						</div>

						<div className='flex justify-end gap-4 mt-4'>
							<button
								onClick={() => setEditingPost(null)}
								className='bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition'
							>
								Отмена
							</button>
							<button
								onClick={handleUpdatePost}
								disabled={saving}
								className='bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition'
							>
								{saving ? 'Обновление...' : 'Обновить'}
							</button>
						</div>
					</div>
				) : posts.length === 0 ? (
					<div className='text-center space-y-6'>
						<h2 className='text-2xl font-semibold text-gray-700'>Постов нет</h2>
						<p className='text-gray-600'>Создайте первый пост.</p>
						<button
							onClick={() => setIsCreating(true)}
							className='bg-green-500 text-white px-8 py-3 rounded-xl text-lg font-semibold shadow-md hover:bg-green-600 transition'
						>
							Создать пост
						</button>
					</div>
				) : (
					<>
						<div className='flex flex-col w-full gap-6'>
							{posts.map(post => (
								<div
									key={post.id}
									className='w-[95%] mx-auto rounded-2xl p-6 border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 transition cursor-pointer'
									onClick={() => router.push(`/feedbacks?postId=${post.id}`)}
								>
									<h2 className='text-2xl font-semibold text-blue-700 mb-2'>
										{post.projectName}
									</h2>

									<p className='text-gray-700 mb-1'>Цена: {post.price} ₽</p>
									<p className='text-gray-600 mb-3'>
										{post.description || 'Без описания'}
									</p>

									<div className='flex gap-3 mt-4'>
										<button
											onClick={e => {
												e.stopPropagation()
												setEditingPost(post)
											}}
											className='bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition'
										>
											Редактировать
										</button>
										<button
											onClick={e => {
												e.stopPropagation()
												handleDeletePost(post.id)
											}}
											className='bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition'
										>
											Удалить
										</button>
									</div>
								</div>
							))}
						</div>

						<div className='mt-8'>
							<button
								onClick={() => setIsCreating(true)}
								className='bg-green-500 text-white px-8 py-3 rounded-xl text-lg font-semibold shadow-md hover:bg-green-600 transition'
							>
								Создать новый пост
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	)
}
