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

interface SearchParams {
	userId: number
	like?: string
	priceBetween?: [number, number]
	sortedColumn?: string
	sortedParam?: 'ASC' | 'DESC'
}

export default function AllPostsPage() {
	const router = useRouter()
	const [posts, setPosts] = useState<PostCard[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const [offset, setOffset] = useState(0)
	const [limit] = useState(30)
	const [hasMore, setHasMore] = useState(true)
	const [userId, setUserId] = useState<string | null>(null)

	const [searchParams, setSearchParams] = useState<SearchParams>({
		userId: 0,
		like: '',
		priceBetween: undefined,
		sortedColumn: 'id',
		sortedParam: 'DESC',
	})

	const [activeFilters, setActiveFilters] = useState<SearchParams>(searchParams)

	const [minPrice, setMinPrice] = useState('')
	const [maxPrice, setMaxPrice] = useState('')

	const [selectedPost, setSelectedPost] = useState<PostCard | null>(null)
	const [suggestedPrice, setSuggestedPrice] = useState('')
	const [sendingFeedback, setSendingFeedback] = useState(false)
	const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

	const fetchPosts = async (
		params: SearchParams,
		append = false,
		customOffset?: number
	) => {
		try {
			setLoading(true)
			setError(null)
			const query = new URLSearchParams()
			const id_user = localStorage.getItem('id_user')
			if (id_user) {
				query.append('userId', id_user)
			}
			if (params.like) query.append('like', params.like)
			if (params.priceBetween) {
				query.append('priceMin', params.priceBetween[0].toString())
				query.append('priceMax', params.priceBetween[1].toString())
			}
			if (params.sortedColumn) query.append('sortedColumn', params.sortedColumn)
			if (params.sortedParam) query.append('sortedParam', params.sortedParam)

			const currentOffset = customOffset !== undefined ? customOffset : offset
			query.append('offset', currentOffset.toString())
			query.append('limit', limit.toString())

			const res = await fetchWithAuth(
				`${API_URL}/api/post/global?${query.toString()}`,
				{
					method: 'GET',
					headers: { 'Content-Type': 'application/json' },
				}
			)

			if (!res.ok) throw new Error(`Ошибка загрузки постов: ${res.status}`)
			const data: PostCard[] = await res.json()

			const combinedPosts = append ? [...posts, ...data] : data
			const uniquePosts = Array.from(
				new Map(combinedPosts.map(p => [p.id, p])).values()
			)

			setPosts(uniquePosts)

			setOffset(prev => (append ? prev + data.length : data.length))
			setHasMore(data.length === limit)
		} catch (err: any) {
			setError(err.message)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		setUserId(localStorage.getItem('id_user'))
		fetchPosts(activeFilters, false, 0)
	}, [])

	const handleSearch = () => {
		const params: SearchParams = {
			userId: searchParams.userId,
			like: searchParams.like,
			sortedColumn: searchParams.sortedColumn,
			sortedParam: searchParams.sortedParam,
		}

		const min = Number(minPrice)
		const max = Number(maxPrice)
		if (!isNaN(min) && !isNaN(max)) {
			params.priceBetween = [min, max]
		}

		setActiveFilters(params)
		setOffset(0)
		fetchPosts(params, false, 0)
	}

	const handleResetFilters = () => {
		const params: SearchParams = {
			userId: 0,
			like: '',
			sortedColumn: 'id',
			sortedParam: 'DESC',
			priceBetween: undefined,
		}

		setSearchParams(params)
		setMinPrice('')
		setMaxPrice('')
		setActiveFilters(params)
		setOffset(0)
		fetchPosts(params, false, 0)
	}

	const handleLoadMore = () => {
		fetchPosts(activeFilters, true)
	}

	const handleOpenFeedback = (post: PostCard) => {
		setSelectedPost(post)
		setSuggestedPrice(post.price.toString())
		setFeedbackMessage(null)
	}

	const sendFeedback = async () => {
		if (!selectedPost) return

		if (!userId) {
			setFeedbackMessage('Вы не авторизованы')
			return
		}

		try {
			setSendingFeedback(true)
			setFeedbackMessage(null)

			const res = await fetchWithAuth(`${API_URL}/api/feedback`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					postId: selectedPost.id,
					userId: Number(userId),
					suggestedPrice: Number(suggestedPrice),
				}),
			})

			if (!res.ok) {
				const text = await res.text().catch(() => null)
				throw new Error(text || `Ошибка отправки: ${res.status}`)
			}

			setFeedbackMessage('Отклик отправлен!')
		} catch (err: any) {
			setFeedbackMessage(err.message || 'Ошибка отправки')
		} finally {
			setSendingFeedback(false)
		}
	}

	if (loading && posts.length === 0)
		return (
			<div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200'>
				<p className='text-gray-600 text-lg'>Загрузка...</p>
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

	return (
		<div className='min-h-screen w-full bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200 py-12'>
			<div className='w-full max-w-7xl mx-auto bg-white/70 backdrop-blur-md shadow-xl rounded-3xl p-8'>
				<div className='flex justify-between items-center mb-8'>
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

					<h1 className='text-3xl font-semibold text-blue-700'>Все проекты</h1>

					<button
						onClick={() => router.push('/feedbacks')}
						className='flex items-center gap-1 text-blue-600 hover:text-blue-800 transition text-lg font-medium'
					>
						<span className='text-base'>📄</span>
						<span>Мои отклики</span>
					</button>
				</div>

				<div className='bg-white/50 rounded-2xl p-6 mb-8 border border-gray-200'>
					<h2 className='text-xl font-semibold mb-4'>Фильтры и поиск</h2>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
						<div>
							<label>Название проекта</label>
							<input
								type='text'
								value={searchParams.like}
								onChange={e =>
									setSearchParams({
										...searchParams,
										like: e.target.value,
									})
								}
								className='w-full px-4 py-2 border rounded-lg'
							/>
						</div>

						<div>
							<label>Минимальная цена</label>
							<input
								type='number'
								value={minPrice}
								onChange={e => setMinPrice(e.target.value)}
								className='w-full px-4 py-2 border rounded-lg'
							/>
						</div>

						<div>
							<label>Максимальная цена</label>
							<input
								type='number'
								value={maxPrice}
								onChange={e => setMaxPrice(e.target.value)}
								className='w-full px-4 py-2 border rounded-lg'
							/>
						</div>

						<div>
							<label>Сортировка</label>
							<select
								value={`${searchParams.sortedColumn}-${searchParams.sortedParam}`}
								onChange={e => {
									const [col, param] = e.target.value.split('-')
									setSearchParams({
										...searchParams,
										sortedColumn: col,
										sortedParam: param as 'ASC' | 'DESC',
									})
								}}
								className='w-full px-4 py-2 border rounded-lg'
							>
								<option value='id-DESC'>Сначала новые</option>
								<option value='id-ASC'>Сначала старые</option>
								<option value='price-DESC'>Цена ↓</option>
								<option value='price-ASC'>Цена ↑</option>
								<option value='projectName-ASC'>Название А–Я</option>
								<option value='projectName-DESC'>Название Я–А</option>
							</select>
						</div>
					</div>

					<div className='flex gap-3'>
						<button
							onClick={handleSearch}
							className='bg-blue-600 text-white px-6 py-2 rounded-lg'
						>
							Применить фильтры
						</button>
						<button
							onClick={handleResetFilters}
							className='bg-gray-500 text-white px-6 py-2 rounded-lg'
						>
							Сбросить
						</button>
					</div>
				</div>

				<div className='flex flex-col gap-6'>
					{posts.map((post, index) => (
						<div
							key={`${post.id}-${index}`}
							className='bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-blue-300 shadow transition w-full'
						>
							<h2 className='text-2xl font-semibold text-blue-700 mb-3'>
								{post.projectName}
							</h2>

							<p className='text-xl font-bold text-green-600 mb-3'>
								{post.price.toLocaleString()} ₽
							</p>

							<p className='text-gray-600 mb-4'>
								{post.description || 'Описание отсутствует'}
							</p>

							<button
								onClick={() => handleOpenFeedback(post)}
								className='bg-blue-500 text-white px-6 py-2 rounded-lg'
							>
								Откликнуться
							</button>
						</div>
					))}
				</div>

				{hasMore && (
					<div className='flex justify-center mt-6'>
						<button
							onClick={handleLoadMore}
							className='bg-blue-600 text-white px-6 py-2 rounded-lg'
							disabled={loading}
						>
							{loading ? 'Загрузка...' : 'Показать больше'}
						</button>
					</div>
				)}
			</div>

			{selectedPost && (
				<div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'>
					<div className='bg-white rounded-2xl p-6 w-full max-w-md shadow-xl'>
						<h2 className='text-2xl font-semibold text-blue-700 mb-4'>
							Отклик на проект
						</h2>

						<p className='font-medium mb-2'>{selectedPost.projectName}</p>

						<label className='block mb-1'>Ваша цена:</label>
						<input
							type='number'
							value={suggestedPrice}
							onChange={e => setSuggestedPrice(e.target.value)}
							className='w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400'
						/>

						{feedbackMessage && (
							<p className='mb-4 text-center text-sm'>{feedbackMessage}</p>
						)}

						<div className='flex justify-end gap-3'>
							<button
								onClick={sendFeedback}
								disabled={sendingFeedback}
								className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50'
							>
								{sendingFeedback ? 'Отправка...' : 'Отправить'}
							</button>
							<button
								onClick={() => setSelectedPost(null)}
								className='px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition'
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
