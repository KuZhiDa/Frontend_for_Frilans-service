import { API_URL } from '@/lib/api'

export const getAccessToken = () => {
	return typeof window !== 'undefined'
		? localStorage.getItem('access_token')
		: null
}

export const getUserId = () => {
	return typeof window !== 'undefined' ? localStorage.getItem('id_user') : null
}

export const logout = () => {
	localStorage.removeItem('access_token')
	localStorage.removeItem('id_user')
	window.location.href = '/login'
}

export const refreshAccessToken = async (): Promise<string> => {
	try {
		const res = await fetch(`${API_URL}/api/token`, {
			method: 'PATCH',
			credentials: 'include',
		})

		if (!res.ok) throw new Error('Ошибка продления токена')

		const data = await res.json()

		if (!data.access) throw new Error('Сервер не вернул access токен')

		localStorage.setItem('access_token', data.access)

		return data.access
	} catch (err) {
		logout()
		throw err
	}
}

export const fetchWithAuth = async (
	url: string,
	options: RequestInit = {}
): Promise<Response> => {
	let token = getAccessToken()

	let res = await fetch(url, {
		...options,
		headers: {
			Authorization: `Bearer ${token}`,
			...(options.headers || {}),
		},
	})

	if (res.status === 401) {
		const newToken = await refreshAccessToken()

		res = await fetch(url, {
			...options,
			headers: {
				Authorization: `Bearer ${newToken}`,
				...(options.headers || {}),
			},
		})
	}

	if (!res.ok) {
		const data = await res.json().catch(() => ({}))
		console.log(data)
		throw { response: { data } }
	}

	return res
}
