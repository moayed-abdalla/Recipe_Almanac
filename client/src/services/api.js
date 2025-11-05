/**
* API SERVICE LAYER
*
* Centralized API calls with automatic token injection.
* All backend communication goes through this module.
*/
import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Create axios instance with default config
const api = axios.create({
baseURL: API_BASE_URL,
headers: {
'Content-Type': 'application/json'
}
});
// Request interceptor: Add auth token to all requests
api.interceptors.request.use(
(config) =&gt; {
const token = localStorage.getItem('token');
if (token) {
config.headers.Authorization = `Bearer ${token}`;
}
return config;
},
(error) =&gt; Promise.reject(error)
);
// Response interceptor: Handle auth errors
api.interceptors.response.use(
(response) =&gt; response,
(error) =&gt; {
if (error.response?.status === 401) {
// Token expired or invalid - logout user
localStorage.removeItem('token');
localStorage.removeItem('user');
window.location.href = '/login';
}
return Promise.reject(error);
}
);
export default {
// Auth endpoints
auth: {
register: (data) =&gt; api.post('/auth/register', data),
login: (data) =&gt; api.post('/auth/login', data),
verify: () =&gt; api.get('/auth/verify'),
me: () =&gt; api.get('/auth/me')
},
5. API Service Layer (client/src/services/api.js)
// Recipe endpoints
recipes: {
getAll: (params) =&gt; api.get('/recipes', { params }),
getOne: (owner, name) =&gt; api.get(`/recipes/${owner}/${name}`),
create: (data) =&gt; api.post('/recipes', data),
update: (owner, name, data) =&gt; api.put(`/recipes/${owner}/${name}`, data),
delete: (owner, name) =&gt; api.delete(`/recipes/${owner}/${name}`)
},
// User endpoints
users: {
getProfile: (username) =&gt; api.get(`/users/${username}`),
updateProfile: (username, data) =&gt; api.put(`/users/${username}`, data),
getRecipes: (username) =&gt; api.get(`/users/${username}/recipes`),
getStats: (username) =&gt; api.get(`/users/${username}/stats`)
},
// Almanac endpoints
almanac: {
getSaved: (username) =&gt; api.get(`/almanac/${username}`),
saveRecipe: (data) =&gt; api.post('/almanac', data),
unsaveRecipe: (data) =&gt; api.delete('/almanac', { data }),
checkSaved: (username, owner, recipe) =&gt;
api.get(`/almanac/${username}/check/${owner}/${recipe}`)
}
};
