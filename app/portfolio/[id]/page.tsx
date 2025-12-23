'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { API_URL } from '@/lib/api'
import { fetchWithAuth } from '@/lib/authFetch'

interface PortfolioCard {
	id: number
	skillName: string
	experience: number
	infoAboutSkillOrExperience?: string
	project: boolean
}

interface FormErrors {
	skillName?: string
	experience?: string
	infoAboutSkillOrExperience?: string
}

interface ErrorResponse {
	message?: string | Record<string, Record<string, string>>
}

export default function PortfolioPage() {
	const router = useRouter()
	const params = useParams()
	const [cards, setCards] = useState<PortfolioCard[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [isCreating, setIsCreating] = useState(false)
	const [saving, setSaving] = useState(false)
	const [formData, setFormData] = useState({
		id: '',
		skillName: '',
		experience: '',
		infoAboutSkillOrExperience: '',
	})
	const [errors, setErrors] = useState<FormErrors>({})
	const [showEmailModal, setShowEmailModal] = useState(false)
	const [resendingEmail, setResendingEmail] = useState(false)
	const [emailError, setEmailError] = useState<string | null>(null)
	const isEmailConfirmationRequired = (message?: string) =>
		typeof message === 'string' &&
		message.toLowerCase().includes('не подтвердил')

	const handleEmailConfirmationRestriction = () => {
		if (isMyProfile) {
			setShowEmailModal(true)
			sendVerificationEmail()
		} else {
			setCards([])
		}
	}

	const id_user_from_storage =
		typeof window !== 'undefined' ? localStorage.getItem('id_user') : null
	const id_user_from_params = params.id as string
	const currentUserId = id_user_from_params || id_user_from_storage

	const isMyProfile =
		!id_user_from_params || id_user_from_params === id_user_from_storage

	const sendVerificationEmail = async () => {
		if (!isMyProfile) return

		try {
			setResendingEmail(true)
			setEmailError(null)
			const id_user = localStorage.getItem('id_user')
			const accessToken = localStorage.getItem('access_token')

			if (!id_user || !accessToken) {
				setEmailError('Требуется авторизация')
				return
			}

			await fetchWithAuth(`${API_URL}/api/email/send/${id_user}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
			})
		} catch (err: any) {
			const message = err?.response?.data?.message
			const errorMessage =
				typeof message === 'string'
					? message
					: err?.message || 'Ошибка при отправке письма'
			setEmailError('Ошибка при отправке письма: ' + errorMessage)
		} finally {
			setResendingEmail(false)
		}
	}

	useEffect(() => {
		const token = localStorage.getItem('access_token')

		if (!token || !currentUserId) {
			router.push('/login')
			return
		}

		const loadCards = async () => {
			try {
				setLoading(true)
				setError(null)
				const res = await fetchWithAuth(
					`${API_URL}/api/work-info/${currentUserId}`
				)
				const data: PortfolioCard[] = await res.json()
				setCards(data)
			} catch (err: any) {
				const message = err?.response?.data?.message
				const errorMessage =
					typeof message === 'string'
						? message
						: err?.message || 'Ошибка загрузки портфолио'
				if (isEmailConfirmationRequired(errorMessage)) {
					handleEmailConfirmationRestriction()
				} else {
					setError(errorMessage)
				}
			} finally {
				setLoading(false)
			}
		}

		loadCards()
	}, [router, currentUserId, isMyProfile])

	const handleCreateCard = async () => {
		if (!isMyProfile) return

		try {
			setSaving(true)
			setErrors({})
			const id_user = localStorage.getItem('id_user')

			const res = await fetchWithAuth(
				`${API_URL}/api/work-info/card/${id_user}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						skillName: formData.skillName,
						experience: Number(formData.experience),
						infoAboutSkillOrExperience: formData.infoAboutSkillOrExperience,
					}),
				}
			)

			const newCard = await res.json()
			setCards(prev => [...prev, newCard])
			setIsCreating(false)
			setFormData({
				id: '',
				skillName: '',
				experience: '',
				infoAboutSkillOrExperience: '',
			})
			setErrors({})
		} catch (err: any) {
			const message = err?.response?.data?.message

			if (
				message &&
				typeof message === 'object' &&
				!Array.isArray(message) &&
				message !== null
			) {
				const messages: Record<string, Record<string, string>> = message
				const backendErrors: FormErrors = {}

				if (Object.keys(messages).length > 0) {
					Object.keys(messages).forEach(field => {
						const msgObj = messages[field]
						if (msgObj && typeof msgObj === 'object') {
							if (msgObj.isNotEmpty)
								backendErrors[field as keyof FormErrors] = msgObj.isNotEmpty
							else if (msgObj.isLength)
								backendErrors[field as keyof FormErrors] = msgObj.isLength
							else if (msgObj.length)
								backendErrors[field as keyof FormErrors] = msgObj.length
							else if (msgObj.min)
								backendErrors[field as keyof FormErrors] = msgObj.min
							else if (msgObj.max)
								backendErrors[field as keyof FormErrors] = msgObj.max
							else if (msgObj.matches)
								backendErrors[field as keyof FormErrors] = msgObj.matches
						}
					})
					setErrors(backendErrors)
					return
				}
			}

			const errorMessage =
				typeof message === 'string'
					? message
					: err?.message || 'Ошибка при создании карточки'
			alert('Ошибка: ' + errorMessage)
		} finally {
			setSaving(false)
		}
	}

	const renderFieldErrors = (field: keyof FormErrors) => {
		const msg = errors[field]
		if (!msg) return null
		return <p className='text-red-600 text-sm mt-1'>{msg}</p>
	}

	const handleBack = () => {
		router.push(`/dashboard/${id_user_from_params}`)
	}

	if (loading)
		return (
			<div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200'>
				<p className='text-gray-600 text-lg'>Загрузка портфолио...</p>
			</div>
		)

	return (
		<div className='min-h-screen w-full bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200 flex flex-col items-center py-12'>
			{showEmailModal && isMyProfile && (
				<div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
					<div className='bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center'>
						<h2 className='text-2xl font-semibold text-gray-800'>
							Email не подтвержден
						</h2>
						<p className='text-gray-600 my-4'>
							{resendingEmail
								? 'Отправляем письмо для подтверждения...'
								: 'На вашу почту было отправлено письмо. После подтверждения обновите страницу.'}
						</p>
						{emailError && (
							<p className='text-red-600 text-sm mb-4'>{emailError}</p>
						)}
						<button
							onClick={() => router.push(`/dashboard/${id_user_from_params}`)}
							className='bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition'
						>
							Вернуться в кабинет
						</button>
					</div>
				</div>
			)}

			<div className='w-full max-w-5xl bg-white/70 backdrop-blur-md shadow-xl rounded-3xl p-10 flex flex-col items-center'>
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
						Портфолио
					</h1>
					<div className='w-24'></div>
				</div>

				{error && (
					<div className='w-full bg-red-50 border border-red-200 rounded-lg p-4 mb-6'>
						<p className='text-red-600 text-center'>{error}</p>
					</div>
				)}

				{cards.length === 0 && !isCreating ? (
					<div className='text-center space-y-6 w-full'>
						<h2 className='text-2xl font-semibold text-gray-700'>
							Портфолио не создано
						</h2>
						{isMyProfile && (
							<button
								onClick={() => setIsCreating(true)}
								className='bg-green-500 text-white px-8 py-3 rounded-xl text-lg font-semibold shadow-md hover:bg-green-600 hover:shadow-lg transition-all duration-300'
							>
								Создать карточку
							</button>
						)}
					</div>
				) : isCreating ? (
					isMyProfile ? (
						<div className='space-y-6 w-full'>
							<h2 className='text-2xl font-semibold text-gray-800'>
								Создание карточки портфолио
							</h2>

							<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-2'>
										Навык
									</label>
									<input
										type='text'
										value={formData.skillName}
										onChange={e => {
											setFormData({ ...formData, skillName: e.target.value })
											if (errors.skillName) {
												setErrors(prev => {
													const newErrors = { ...prev }
													delete newErrors.skillName
													return newErrors
												})
											}
										}}
										className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
											errors.skillName ? 'border-red-500 bg-red-50' : ''
										}`}
									/>
									{renderFieldErrors('skillName')}
								</div>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-2'>
										Опыт (лет)
									</label>
									<input
										type='number'
										value={formData.experience}
										onChange={e => {
											setFormData({ ...formData, experience: e.target.value })
											if (errors.experience) {
												setErrors(prev => {
													const newErrors = { ...prev }
													delete newErrors.experience
													return newErrors
												})
											}
										}}
										className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
											errors.experience ? 'border-red-500 bg-red-50' : ''
										}`}
									/>
									{renderFieldErrors('experience')}
								</div>
								<div className='md:col-span-2'>
									<label className='block text-sm font-medium text-gray-700 mb-2'>
										Описание
									</label>
									<textarea
										value={formData.infoAboutSkillOrExperience}
										onChange={e => {
											setFormData({
												...formData,
												infoAboutSkillOrExperience: e.target.value,
											})
											if (errors.infoAboutSkillOrExperience) {
												setErrors(prev => {
													const newErrors = { ...prev }
													delete newErrors.infoAboutSkillOrExperience
													return newErrors
												})
											}
										}}
										rows={4}
										className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
											errors.infoAboutSkillOrExperience
												? 'border-red-500 bg-red-50'
												: ''
										}`}
									/>
									{renderFieldErrors('infoAboutSkillOrExperience')}
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
									onClick={handleCreateCard}
									className='bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition'
									disabled={saving}
								>
									{saving ? 'Сохранение...' : 'Сохранить'}
								</button>
							</div>
						</div>
					) : null
				) : (
					<>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-6 w-full'>
							{cards.map(card => (
								<div
									key={card.id}
									onClick={() =>
										router.push(
											`/portfolio/${currentUserId}/project/${card.id}`
										)
									}
									className={`rounded-2xl p-6 border-2 transition-colors duration-300 cursor-pointer border-blue-300 hover:bg-blue-100 hover:shadow-lg`}
								>
									<h2 className='text-2xl font-semibold text-blue-700 mb-2'>
										{card.skillName}
									</h2>
									<p className='text-gray-700 mb-1'>
										Опыт: {card.experience} лет
									</p>
									<p className='text-gray-600 mb-3'>
										{card.infoAboutSkillOrExperience || 'Без описания'}
									</p>
									{card.project ? (
										<p className='text-green-600 font-medium'>Есть проекты →</p>
									) : (
										<p className='text-gray-400 italic'>Проектов нет</p>
									)}
								</div>
							))}
						</div>

						{isMyProfile && (
							<div className='mt-8'>
								<button
									onClick={() => setIsCreating(true)}
									className='bg-green-500 text-white px-8 py-3 rounded-xl text-lg font-semibold shadow-md hover:bg-green-600 hover:shadow-lg transition-all duration-300'
								>
									Добавить новую карточку
								</button>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	)
}
