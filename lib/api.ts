export const API_URL = 'http://localhost:5000'

//---------------------------------------------------------
//                      Register
//---------------------------------------------------------
export interface RegisterForm {
	username: string
	email: string
	phoneNumber?: string
	password: string
	is2Fa: boolean
}

export async function registerUser(form: RegisterForm) {
	const res = await fetch(`${API_URL}/api/auth/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(form),
	})

	if (!res.ok) {
		const data = await res.json().catch(() => ({}))
		throw { response: { data } }
	}

	return res.json()
}

//---------------------------------------------------------
//                     Login
//---------------------------------------------------------
export interface LoginForm {
	login: string
	password: string
	role_user: 'E' | 'C'
}

export interface LoginResponse {
	access?: string
	id_user?: string
	role_user?: 'E' | 'C'
	role?: 'E' | 'C'
}

export async function loginUser(form: LoginForm): Promise<LoginResponse> {
	const res = await fetch(`${API_URL}/api/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(form),
	})

	if (!res.ok) {
		const data = await res.json().catch(() => ({}))
		throw { response: { data } }
	}

	return res.json()
}

//---------------------------------------------------------
//                         2FA
//---------------------------------------------------------
export const verifyTwoFactorCode = async (
	userId: string,
	userRole: string,
	code: string
) => {
	const res = await fetch(`${API_URL}/api/two-factor-auth/proof-code`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ id: userId, role: userRole, code }),
		credentials: 'include',
	})

	if (!res.ok) {
		const err = await res.json()
		throw new Error(err.message || 'Ошибка проверки кода')
	}

	return res.json()
}

// ----------------- Reset password -----------------
export async function sendEmail(data: { login: string }) {
	const res = await fetch(`${API_URL}/api/reset-password/sand`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	})

	if (!res.ok) {
		const error = await res.json()
		throw new Error(error.message || 'Ошибка запроса к серверу.')
	}

	return await res.json()
}

export async function resetPassword(token: string, password: string) {
	const res = await fetch(`${API_URL}/api/reset-password/update`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token, password }),
	})
	const json = await res.json()

	if (!res.ok) {
		throw { response: { data: json } }
	}
}

//------------------------------------------------------------
//                      Dashboard
//------------------------------------------------------------
export interface UserData {
	id_user: number
	username: string
	email: string | null
	phone_number: string | null
	rating: number
	avatar_name?: string
}

export async function fetchUserData(
	id_user: string,
	accessToken: string
): Promise<UserData> {
	const res = await fetch(`${API_URL}/api/users/info/${id_user}`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	})
	if (!res.ok) {
		const err = await res.json().catch(() => ({}))
		throw new Error(err.message || 'Ошибка при получении данных пользователя')
	}
	const json = await res.json()
	return {
		id_user: parseInt(id_user),
		username: json.data.username,
		email: json.data.email,
		phone_number: json.data.phone_number,
		rating: json.data.rating,
		avatar_name: json.imageInfo.avatar_name,
	}
}

export async function fetchUserProjects(id_user: string, accessToken: string) {
	const res = await fetch(`${API_URL}/api/project/${id_user}`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	})
	if (!res.ok) {
		const err = await res.json().catch(() => ({}))
		throw new Error(err.message || 'Ошибка при получении проектов')
	}
	return res.json()
}

export async function uploadAvatar(file: File, accessToken: string) {
	const formData = new FormData()
	formData.append('avatar', file)

	const res = await fetch(`${API_URL}/api/image/add`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${accessToken}` },
		body: formData,
	})
	if (!res.ok) {
		const err = await res.json().catch(() => ({}))
		throw new Error(err.message || 'Ошибка загрузки аватара')
	}
	return res.json()
}

export function getAvatarUrl(user: UserData) {
	if (user.avatar_name) {
		return `${API_URL}/avatar/${user.avatar_name}?t=${Date.now()}`
	}
	return '/default-avatar.jpg'
}
