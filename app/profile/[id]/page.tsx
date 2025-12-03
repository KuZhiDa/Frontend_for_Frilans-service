'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { API_URL } from '@/lib/api'
import { fetchWithAuth } from '@/lib/authFetch'

interface ProfileResponse {
	message?: string
	id_user?: number
	age?: number
	male?: 'М' | 'Ж'
	countryFrom?: string
	cityFrom?: string
	infoAboutYourself?: string
	education?: string
}

interface ValidationErrors {
	age?: { min?: string; max?: string }
	male?: { isIn?: string }
	countryFrom?: { matches?: string }
	cityFrom?: { matches?: string }
	infoAboutYourself?: { max?: string }
	education?: { max?: string }
}

interface ErrorResponse {
	message?: string | ValidationErrors
}

export default function ProfilePage() {
	const router = useRouter()
	const params = useParams()
	const [profileData, setProfileData] = useState<ProfileResponse | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [isEditing, setIsEditing] = useState(false)
	const [saving, setSaving] = useState(false)
	const [deleting, setDeleting] = useState(false)
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
	const [showEmailModal, setShowEmailModal] = useState(false)
	const [resendingEmail, setResendingEmail] = useState(false)
	const [emailError, setEmailError] = useState<string | null>(null)
	const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

	const [formData, setFormData] = useState({
		age: '',
		male: '' as 'М' | 'Ж' | '',
		countryFrom: '',
		cityFrom: '',
		infoAboutYourself: '',
		education: '',
	})

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

			const response = await fetchWithAuth(
				`${API_URL}/api/email/send/${id_user}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
				}
			)

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

	const isEmailConfirmationRequired = (message?: string) =>
		typeof message === 'string' && message.toLowerCase().includes('не подтвердил')

	const handleEmailConfirmationRestriction = () => {
		if (isMyProfile) {
			setShowEmailModal(true)
			sendVerificationEmail()
		} else {
			setProfileData(null)
		}
	}

	useEffect(() => {
		const token = localStorage.getItem('access_token')

		if (!token || !currentUserId) {
			router.push('/login')
			return
		}

		const loadProfile = async () => {
			try {
				setLoading(true)
				setError(null)
				const res = await fetchWithAuth(
					`${API_URL}/api/profile/info/${currentUserId}`
				)
				const data: ProfileResponse = await res.json()

				setProfileData(data)

				if (!data.message) {
					setFormData({
						age: data.age?.toString() || '',
						male: data.male || '',
						countryFrom: data.countryFrom || '',
						cityFrom: data.cityFrom || '',
						infoAboutYourself: data.infoAboutYourself || 'О себе',
						education: data.education || '',
					})
				}
			} catch (err: any) {
				const errorMessage = err?.message || 'Ошибка загрузки профиля'
				if (isEmailConfirmationRequired(errorMessage)) {
					handleEmailConfirmationRestriction()
				} else {
					setError(errorMessage)
				}
			} finally {
				setLoading(false)
			}
		}

		loadProfile()
	}, [router, currentUserId, isMyProfile])

	const handleSaveOrUpdateProfile = async (method: 'POST' | 'PATCH') => {
		if (!isMyProfile) return

		try {
			setSaving(true)
			setValidationErrors({})
			const id_user = localStorage.getItem('id_user')

			const response = await fetchWithAuth(
				`${API_URL}/api/profile/${
					method === 'POST' ? 'set' : 'update'
				}-info/${id_user}`,
				{
					method,
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						id_user: parseInt(id_user!),
						age: formData.age ? parseInt(formData.age) : null,
						male: formData.male || null,
						countryFrom: formData.countryFrom || null,
						cityFrom: formData.cityFrom || null,
						infoAboutYourself: formData.infoAboutYourself,
						education: formData.education,
					}),
				}
			)

			if (!response.ok) {
				const errorData: ErrorResponse = await response.json()
				if (errorData.message && typeof errorData.message === 'object') {
					setValidationErrors(errorData.message as ValidationErrors)
					return
				} else {
					throw new Error(
						typeof errorData.message === 'string'
							? errorData.message
							: 'Ошибка при сохранении профиля'
					)
				}
			}

			const savedProfile = await response.json()
			setProfileData(savedProfile)
			setIsEditing(false)
			setValidationErrors({})
		} catch (err: any) {
			alert('Ошибка при сохранении профиля: ' + err.message)
		} finally {
			setSaving(false)
		}
	}

	const handleDeleteProfile = async () => {
		if (!isMyProfile) return

		try {
			setDeleting(true)
			const id_user = localStorage.getItem('id_user')

			const response = await fetchWithAuth(
				`${API_URL}/api/profile/clear-info/${id_user}`,
				{
					method: 'DELETE',
				}
			)

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.message || 'Ошибка при удалении профиля')
			}

			setProfileData(null)
			setShowDeleteConfirm(false)
			router.push(`/dashboard/${id_user_from_params}`)
		} catch (err: any) {
			alert('Ошибка при удалении профиля: ' + err.message)
			setShowDeleteConfirm(false)
		} finally {
			setDeleting(false)
		}
	}

	const handleCancelEdit = () => {
		if (profileData && !profileData.message) {
			setFormData({
				age: profileData.age?.toString() || '',
				male: profileData.male || '',
				countryFrom: profileData.countryFrom || '',
				cityFrom: profileData.cityFrom || '',
				infoAboutYourself: profileData.infoAboutYourself || 'О себе',
				education: profileData.education || '',
			})
		} else {
			setFormData({
				age: '',
				male: '',
				countryFrom: '',
				cityFrom: '',
				infoAboutYourself: 'О себе',
				education: '',
			})
		}
		setIsEditing(false)
		setValidationErrors({})
	}

	const handleBack = () => {
		router.push(`/dashboard/${id_user_from_params}`)
	}

	const getFieldError = (fieldName: keyof ValidationErrors): string | null => {
		const fieldErrors = validationErrors[fieldName]
		if (!fieldErrors) return null
		return Object.values(fieldErrors)[0] || null
	}

	if (loading)
		return (
			<div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200'>
				<p className='text-gray-600 text-lg'>Загрузка профиля...</p>
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

	const hasProfile = profileData && !profileData.message

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

			{showDeleteConfirm && (
				<div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
					<div className='bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center'>
						<h2 className='text-2xl font-semibold text-gray-800'>
							Удаление профиля
						</h2>
						<p className='text-gray-600 my-4'>
							Вы уверены, что хотите удалить свой профиль? Это действие нельзя
							отменить.
						</p>
						<div className='flex gap-4 justify-center'>
							<button
								onClick={() => setShowDeleteConfirm(false)}
								className='bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition flex-1'
								disabled={deleting}
							>
								Отмена
							</button>
							<button
								onClick={handleDeleteProfile}
								className='bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition flex-1 flex items-center justify-center gap-2'
								disabled={deleting}
							>
								{deleting ? (
									<div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
								) : (
									'Удалить'
								)}
							</button>
						</div>
					</div>
				</div>
			)}

			<div className='w-full max-w-4xl bg-white/70 backdrop-blur-md shadow-xl rounded-3xl p-10 flex flex-col items-center'>
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
						Профиль исполнителя
					</h1>
					<div className='w-24'></div>
				</div>

				{error && (
					<div className='w-full bg-red-50 border border-red-200 rounded-lg p-4 mb-6'>
						<p className='text-red-600 text-center'>{error}</p>
					</div>
				)}

				<div className='bg-white/80 backdrop-blur-sm rounded-2xl p-8 border-2 border-gray-200 w-full'>
					{!hasProfile && !isEditing ? (
						<div className='text-center space-y-6 w-full'>
							<h2 className='text-2xl font-semibold text-gray-700'>
								Профиль не создан
							</h2>
							{isMyProfile && (
								<button
									onClick={() => setIsEditing(true)}
									className='bg-green-500 text-white px-8 py-3 rounded-xl text-lg font-semibold shadow-md hover:bg-green-600 hover:shadow-lg transition-all duration-300'
								>
									Создать карточку профиля
								</button>
							)}
						</div>
					) : isEditing ? (
						isMyProfile ? (
							<div className='space-y-6 w-full'>
								<h2 className='text-2xl font-semibold text-gray-800'>
									{hasProfile ? 'Редактирование профиля' : 'Создание профиля'}
								</h2>

								<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-2'>
											Год рождения
										</label>
										<input
											type='number'
											value={formData.age}
											onChange={e =>
												setFormData({ ...formData, age: e.target.value })
											}
											className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
												getFieldError('age')
													? 'border-red-500 bg-red-50'
													: 'border-gray-300'
											}`}
											min='1900'
											max={new Date().getFullYear()}
										/>
										{getFieldError('age') && (
											<p className='text-red-600 text-sm mt-1'>
												{getFieldError('age')}
											</p>
										)}
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-2'>
											Пол
										</label>
										<select
											value={formData.male}
											onChange={e =>
												setFormData({
													...formData,
													male: e.target.value as 'М' | 'Ж',
												})
											}
											className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
												getFieldError('male')
													? 'border-red-500 bg-red-50'
													: 'border-gray-300'
											}`}
										>
											<option value=''>Выберите пол</option>
											<option value='М'>Мужской</option>
											<option value='Ж'>Женский</option>
										</select>
										{getFieldError('male') && (
											<p className='text-red-600 text-sm mt-1'>
												{getFieldError('male')}
											</p>
										)}
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-2'>
											Образование
										</label>
										<select
											value={formData.education}
											onChange={e =>
												setFormData({ ...formData, education: e.target.value })
											}
											className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
												getFieldError('education')
													? 'border-red-500 bg-red-50'
													: 'border-gray-300'
											}`}
										>
											<option value=''>Выберите образование</option>
											<option value='Нет'>Нет</option>
											<option value='Среднее'>Среднее</option>
											<option value='Среднее специальное'>
												Среднее специальное
											</option>
											<option value='Высшее'>Высшее</option>
											<option value='Неоконченное высшее'>
												Неоконченное высшее
											</option>
											<option value='Другое'>Другое</option>
										</select>
										{getFieldError('education') && (
											<p className='text-red-600 text-sm mt-1'>
												{getFieldError('education')}
											</p>
										)}
									</div>

									<div className='md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6'>
										<div>
											<label className='block text-sm font-medium text-gray-700 mb-2'>
												Страна
											</label>
											<input
												type='text'
												value={formData.countryFrom}
												onChange={e =>
													setFormData({
														...formData,
														countryFrom: e.target.value,
													})
												}
												className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
													getFieldError('countryFrom')
														? 'border-red-500 bg-red-50'
														: 'border-gray-300'
												}`}
											/>
											{getFieldError('countryFrom') && (
												<p className='text-red-600 text-sm mt-1'>
													{getFieldError('countryFrom')}
												</p>
											)}
										</div>

										<div>
											<label className='block text-sm font-medium text-gray-700 mb-2'>
												Город
											</label>
											<input
												type='text'
												value={formData.cityFrom}
												onChange={e =>
													setFormData({ ...formData, cityFrom: e.target.value })
												}
												className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
													getFieldError('cityFrom')
														? 'border-red-500 bg-red-50'
														: 'border-gray-300'
												}`}
											/>
											{getFieldError('cityFrom') && (
												<p className='text-red-600 text-sm mt-1'>
													{getFieldError('cityFrom')}
												</p>
											)}
										</div>
									</div>

									<div className='md:col-span-2'>
										<label className='block text-sm font-medium text-gray-700 mb-2'>
											О себе
										</label>
										<textarea
											value={formData.infoAboutYourself}
											onChange={e =>
												setFormData({
													...formData,
													infoAboutYourself: e.target.value,
												})
											}
											rows={4}
											className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
												getFieldError('infoAboutYourself')
													? 'border-red-500 bg-red-50'
													: 'border-gray-300'
											}`}
										/>
										{getFieldError('infoAboutYourself') && (
											<p className='text-red-600 text-sm mt-1'>
												{getFieldError('infoAboutYourself')}
											</p>
										)}
									</div>
								</div>

								<div className='flex justify-end gap-4 mt-4'>
									<button
										onClick={handleCancelEdit}
										className='bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition'
									>
										Отмена
									</button>
									<button
										onClick={() =>
											hasProfile
												? handleSaveOrUpdateProfile('PATCH')
												: handleSaveOrUpdateProfile('POST')
										}
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
							<div className='space-y-6'>
								<h2 className='text-2xl font-semibold text-gray-800'>
									Данные профиля
								</h2>
								<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
									<div className='space-y-2'>
										<p className='text-sm text-gray-600'>Год рождения</p>
										<p className='text-lg font-medium'>
											{profileData?.age || 'Не указан'}
										</p>
									</div>
									<div className='space-y-2'>
										<p className='text-sm text-gray-600'>Пол</p>
										<p className='text-lg font-medium'>
											{profileData?.male === 'М'
												? 'Мужской'
												: profileData?.male === 'Ж'
												? 'Женский'
												: 'Не указан'}
										</p>
									</div>
									<div className='space-y-2'>
										<p className='text-sm text-gray-600'>Образование</p>
										<p className='text-lg font-medium'>
											{profileData?.education || 'Не указано'}
										</p>
									</div>
									<div className='space-y-2'>
										<p className='text-sm text-gray-600'>Страна</p>
										<p className='text-lg font-medium'>
											{profileData?.countryFrom || 'Не указана'}
										</p>
									</div>
									<div className='space-y-2'>
										<p className='text-sm text-gray-600'>Город</p>
										<p className='text-lg font-medium'>
											{profileData?.cityFrom || 'Не указан'}
										</p>
									</div>
									<div className='md:col-span-2 space-y-2'>
										<p className='text-sm text-gray-600'>О себе</p>
										<p className='text-lg font-medium'>
											{profileData?.infoAboutYourself || 'Не указано'}
										</p>
									</div>
								</div>
							</div>

							{isMyProfile && (
								<div className='mt-8 flex justify-center gap-4'>
									<button
										onClick={() => setIsEditing(true)}
										className='bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition'
									>
										Редактировать
									</button>
									<button
										onClick={() => setShowDeleteConfirm(true)}
										className='bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition'
									>
										Удалить
									</button>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	)
}
