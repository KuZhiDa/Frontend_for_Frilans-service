'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { API_URL } from '@/lib/api'
import { fetchWithAuth } from '@/lib/authFetch'

interface Feedback {
	id: number
	postId: number
	userId: number
	suggestedPrice: number
	createdAt: string
	updatedAt: string
	post: {
		project_name: string
		description: string
		price: number
	}
	executor?: {
		username: string
		id: number
		rating_count: number
		rating_sum: number
		createdAt: string
	}
}

export default function MyFeedbacksPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [selectedFeedbackId, setSelectedFeedbackId] = useState<number | null>(
		null
	)
	const [deadlineDate, setDeadlineDate] = useState('')
	const [acceptingFeedback, setAcceptingFeedback] = useState(false)

	const fetchFeedbacks = async () => {
		try {
			setLoading(true)
			setError(null)

			const id_user = localStorage.getItem('id_user')
			if (!id_user) throw new Error('Не найден id_user в localStorage')

			const postId = searchParams.get('postId')
			let query = ''
			if (postId) {
				query = `postId=${postId}`
			} else {
				query = `userId=${id_user}`
			}

			const res = await fetchWithAuth(`${API_URL}/api/feedback?${query}`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			})

			if (!res.ok) throw new Error(`Ошибка загрузки откликов: ${res.status}`)
			const data: Feedback[] = await res.json()
			console.log(data)
			setFeedbacks(data)
		} catch (err: any) {
			setError(err.message)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchFeedbacks()
	}, [])

	if (loading) return <div>Загрузка...</div>
	if (error) return <div>Ошибка: {error}</div>

	const isCustomerView = !!searchParams.get('postId')

	const handleAccept = (feedbackId: number) => {
		setSelectedFeedbackId(feedbackId)
		setDeadlineDate('')
		setIsModalOpen(true)
	}

	const handleConfirmAccept = async () => {
		if (!selectedFeedbackId) return
		if (!deadlineDate) {
			alert('Пожалуйста, выберите дату дедлайна')
			return
		}

		try {
			setAcceptingFeedback(true)
			const res = await fetchWithAuth(
				`${API_URL}/api/feedback/accept?feedbackId=${selectedFeedbackId}`,
				{
					method: 'Post',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ deadlineDate }),
				}
			)
			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}))
				throw new Error(errorData.message || 'Ошибка при подтверждении отклика')
			}
			setIsModalOpen(false)
			setSelectedFeedbackId(null)
			setDeadlineDate('')
			fetchFeedbacks()
		} catch (err: any) {
			alert(err.message || 'Ошибка при подтверждении отклика')
		} finally {
			setAcceptingFeedback(false)
		}
	}

	const handleReject = async (feedbackId: number) => {
		try {
			const res = await fetchWithAuth(
				`${API_URL}/api/feedback/reject?feedbackId=${feedbackId}`,
				{
					method: 'DELETE',
				}
			)
			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}))
				throw new Error(errorData.message || 'Ошибка при отклонении отклика')
			}
			// Удаляем отзыв из списка после успешного отклонения
			setFeedbacks(prev => prev.filter(fb => fb.id !== feedbackId))
		} catch (err: any) {
			alert(err.message || 'Ошибка при отклонении отклика')
		}
	}

	return (
		<div className='min-h-screen w-full bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200 py-12'>
			<div className='w-full max-w-7xl mx-auto bg-white/70 backdrop-blur-md shadow-xl rounded-3xl p-8'>
				<div className='flex justify-between items-center mb-8'>
					<button
						onClick={() =>
							router.push(isCustomerView ? '/posts' : '/found-projects')
						}
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
					<h1 className='text-3xl font-semibold text-blue-700'>Мои отклики</h1>
					<div className='w-24' />
				</div>

				<div className='flex flex-col gap-6'>
					{feedbacks.map(fb => (
						<div
							key={fb.id}
							className='bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-blue-300 shadow transition w-full'
						>
							{!isCustomerView && (
								<>
									<h2 className='text-2xl font-semibold text-blue-700 mb-2'>
										{fb.post.project_name}
									</h2>
									<p className='text-gray-600 mb-2'>
										{fb.post.description || 'Описание отсутствует'}
									</p>
								</>
							)}

							{isCustomerView && fb.executor && (
								<div className='flex items-center justify-between mb-2'>
									<p className='text-gray-700'>
										Исполнитель:{' '}
										<span
											className='text-blue-600 font-medium cursor-pointer hover:underline'
											onClick={() =>
												router.push(`/dashboard/${fb.executor!.id}`)
											}
										>
											{fb.executor.username}
										</span>{' '}
										(рейтинг:{' '}
										{fb.executor.rating_sum > 0
											? fb.executor.rating_sum / fb.executor.rating_count
											: 0}
										)
									</p>
									<div className='flex gap-2'>
										<button
											onClick={() => handleAccept(fb.id)}
											className='bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600 transition'
										>
											Подтвердить
										</button>
										<button
											onClick={() => handleReject(fb.id)}
											className='bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600 transition'
										>
											Отказ
										</button>
									</div>
								</div>
							)}

							<p className='text-xl font-bold text-green-600 mb-2'>
								{fb.post.price.toLocaleString()} ₽ →{' '}
								{fb.suggestedPrice.toLocaleString()} ₽
							</p>
							<p className='text-gray-500 text-sm'>
								Отправлено: {new Date(fb.createdAt).toLocaleDateString()}
							</p>
						</div>
					))}
				</div>
			</div>

			{isModalOpen && (
				<div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'>
					<div className='bg-white rounded-2xl p-6 w-full max-w-md shadow-xl'>
						<h2 className='text-2xl font-semibold text-blue-700 mb-4'>
							Подтверждение отклика
						</h2>

						<label className='block mb-1 font-medium'>Дата дедлайна:</label>
						<input
							type='date'
							value={deadlineDate}
							onChange={e => setDeadlineDate(e.target.value)}
							className='w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400'
							min={new Date().toISOString().split('T')[0]}
						/>

						<div className='flex justify-end gap-3'>
							<button
								onClick={handleConfirmAccept}
								disabled={acceptingFeedback || !deadlineDate}
								className='px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed'
							>
								{acceptingFeedback ? 'Отправка...' : 'Подтвердить'}
							</button>
							<button
								onClick={() => {
									setIsModalOpen(false)
									setSelectedFeedbackId(null)
									setDeadlineDate('')
								}}
								disabled={acceptingFeedback}
								className='px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50'
							>
								Отмена
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
