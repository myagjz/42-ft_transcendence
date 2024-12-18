"use strict";

import { router, getCookie, notificationSocket } from '../../code.js';

export async function init(params) {
    const tbody = document.querySelector("tbody");
    let players = [];
    let onlineUsers = new Set();

    const handleNotification = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'user_status_update') {
            onlineUsers = new Set(data.online_users);
            renderUsers();
        }
    };

    const handleTbody = async (event) => {
        if (event.target.classList.contains('username')) {
            await router.navigate(`/profile?username=${event.target.textContent}`);
        }
    }

    const handleOnlineUsers = () => {
        notificationSocket.send(JSON.stringify({ type: 'get_online_users' }));
    }

    async function renderUsers() {
        tbody.innerHTML = '';
        players.sort((a, b) => b.score - a.score);   
        let i = 1;
        players.forEach(element => {
            if (element.username) {
                const isOnline = onlineUsers.has(element.username);
                tbody.insertAdjacentHTML("beforeend", `
                    <tr data-username="${element.username}">
                        <th scope="row">${i}</th>
                        <td><span class="status-dot ${isOnline ? 'online' : 'offline'}"></span></td>
                        <td class='username'>${element.username}</td>
                        <td>${element.score}</td>
                    </tr>`);
                i += 1;
            }
        });
    }    

    async function getAllPlayer() {
        const accessToken = getCookie('access_token');

        if (!accessToken) {
            console.error('error: access token is missing or invalid');
            return;
        }

        try {
            const response = await fetch("/api/get_users_by_score", {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('error:', data);
                return;
            }

            players = data;
            await renderUsers();

            tbody.addEventListener('click', handleTbody);
        } catch (error) {
            console.error('error:', error);
        }
    }

    if (notificationSocket && notificationSocket.readyState === WebSocket.OPEN) {
        notificationSocket.send(JSON.stringify({ type: 'get_online_users' }));
    } else {
        notificationSocket.addEventListener('open', handleOnlineUsers);
    }

    if (notificationSocket) {
        notificationSocket.addEventListener('message', handleNotification);
    }

    await getAllPlayer();

    window.currentCleanup = () => {
        notificationSocket.removeEventListener('message', handleNotification);
        notificationSocket.removeEventListener('open', handleOnlineUsers);
        tbody.removeEventListener('click', handleTbody);
    };
}