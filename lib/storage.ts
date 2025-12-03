export const saveUserData = (data: {
	access_token: string
	id_user: string
	role_user: string
}) => {
	localStorage.setItem('access_token', data.access_token)
	localStorage.setItem('id_user', data.id_user)
	localStorage.setItem('role_user', data.role_user)
}

export const getUserData = () => ({
	access_token: localStorage.getItem('access_token'),
	id_user: localStorage.getItem('id_user'),
	role_user: localStorage.getItem('role_user'),
})

export const clearUserData = () => {
	localStorage.removeItem('access_token')
	localStorage.removeItem('id_user')
	localStorage.removeItem('role_user')
}

export interface UserData {
	access_token: string
	id_user: string
	role_user: string
}
