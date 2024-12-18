import { getUserName, getUserInfo, getCookie, notificationSocket, router } from '../../code.js';

async function getPlayerAvatar(username) {
    const userInfo = await getUserInfo(username);
    return userInfo.avatar_url;
}

async function createGame(winnerUsername, loserUsername, winnerScore, loserScore) {
    const accessToken = getCookie('access_token');
    const csrfToken = getCookie('csrftoken');

    try {
        const response = await fetch('/api/create_game', {
            method: 'POST',
            headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                winner_username : winnerUsername,
                loser_username : loserUsername,
                winner_score : winnerScore,
                loser_score : loserScore
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(data.error);
        }

    } catch (error) {
        console.error('Oyun kaydedilemedi:', error);
    }
}

export async function init(params) {
    const handleProfileClick = () => {
        bootstrap.Modal.getInstance(document.getElementById('gameOverModal')).hide();
        router.navigate('/profile');
    };

    document.getElementById('goToProfile').addEventListener('click', handleProfileClick);
    
    const username = await getUserName();
    let roomId = params.get('room');
    const gameMode = params.get('mode');
    
    if (!roomId) {
        alert("Oda numarası bulunamadı!");
        router.navigate('/profile');
        return;
    }

    let playerSide = null;
    let gameSocket = null;
    

    async function connectToGameSocket() {

        if (gameSocket && gameSocket.readyState === WebSocket.OPEN) {
            console.log('game socket already connected');
            return;
        }

        gameSocket = new WebSocket(
                'wss://' + window.location.host + '/ws/game/' + roomId
            );

        gameSocket.onopen = () => {
            console.log('game socket connection established.');
            gameSocket.send(JSON.stringify({
                type: 'initialize',
                username: username
            }));
        };

        gameSocket.onmessage = async (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'player_assignment':
                    playerSide = data.side;
                    console.log('Player Assignment Data:', {
                        username: data.username,
                        opponent: data.opponent_username,
                        side: data.side
                    });
                    
                    if (playerSide === 'left') {
                        addWallText(data.username, -15);
                        addWallText('0', -15, true);
                        if (data.opponent_username) {
                            addWallText(data.opponent_username, 15);
                            addWallText('0', 15, true);
                        }
                    } else {
                        addWallText(data.username, 15);
                        addWallText('0', 15, true);
                        if (data.opponent_username) {
                            addWallText(data.opponent_username, -15);
                            addWallText('0', -15, true);
                        }
                    }
                    console.log(`You are playing on the ${playerSide} side as ${data.username}`);
                    break;

                case 'ball_update':
                    ball.position.x = data.position.x;
                    ball.position.z = data.position.z;
                    break;

                case 'paddle_update':
                    if (data.username !== username) {
                        if (playerSide === 'left') {
                            rightPaddle.position.z = data.position.z;
                        } else {
                            leftPaddle.position.z = data.position.z;
                        }
                    }
                    break;

                case 'score_update':
                    addWallText(data.scores.left.toString(), -15, true);
                    addWallText(data.scores.right.toString(), 15, true);
                    break;

                case 'game_start':
                    if (data.countdown > 0) {
                        console.log(`game starting in ${data.countdown} seconds...`);

                    } else {
                        console.log('game started!');
                        gameActive = true;
                    }
                    break;
                    
                case 'game_over':
                    if (username === data.winner_username) {
                        await createGame(data.winner_username, data.loser_username, data.winner_score, data.loser_score);
                    }

                    const gameOverLeftUsername = data.player_usernames.left;
                    const gameOverRightUsername = data.player_usernames.right;
                    const [gameOverLeftAvatar, gameOverRightAvatar] = await Promise.all([
                        getPlayerAvatar(gameOverLeftUsername),
                        getPlayerAvatar(gameOverRightUsername)
                    ]);
                    
                    const gameOverModalBody = document.querySelector('#gameOverModal .modal-body');
                    const gameOverPlayerInfos = gameOverModalBody.querySelector('.d-flex');
                    const gameOverWinnerInfo = gameOverModalBody.querySelector('.winner-info');

                    gameOverWinnerInfo.innerHTML = '';

                    if (gameMode === 'tournament' || gameMode === 'tournament_final') {
                        if (username === data.winner_username) {
                            await notificationSocket.send(JSON.stringify({
                                type: 'tournament_winner',
                                username: data.winner_username
                            }));
                        }
                    }

                    gameActive = false;
                    addWallText(data.scores.left.toString(), -15, true);
                    addWallText(data.scores.right.toString(), 15, true);
                    
                    
                    gameOverPlayerInfos.innerHTML = `
                        <div class="player-info text-center">
                            <img src="${gameOverLeftAvatar}" class="rounded-circle border border-danger mb-2" width="64" height="64" alt="${gameOverLeftUsername}">
                            <h6 class="text-light mb-1">${gameOverLeftUsername}</h6>
                            <div class="score text-light">${data.scores.left}</div>
                        </div>
                        <div class="text-light h4">VS</div>
                        <div class="player-info text-center">
                            <img src="${gameOverRightAvatar}" class="rounded-circle border border-danger mb-2" width="64" height="64" alt="${gameOverRightUsername}">
                            <h6 class="text-light mb-1">${gameOverRightUsername}</h6>
                            <div class="score text-light">${data.scores.right}</div>
                        </div>
                    `;
                    
                    if (gameMode === 'tournament') {
                        if (data.winner_username === username) {
                            gameOverWinnerInfo.innerHTML = `
                            <h5 class="p-2 bg-success bg-gradient rounded text-light">Final maçı için bekleniyorsunuz.</h5>
                            `;
                        }
                        else {
                            gameOverWinnerInfo.innerHTML = `
                            <h5 class="p-2 bg-danger bg-gradient rounded text-light">Kaybettiniz!</h5>
                            `;
                        }
                    }
                    else if (gameMode === 'tournament_final'){
                        if (data.winner_username === username) {
                            gameOverWinnerInfo.innerHTML = `
                            <h5 class="p-2 bg-success bg-gradient rounded text-light">ŞAMPİYON oldunuz!</h5>
                            `;
                        }
                        else {
                            gameOverWinnerInfo.innerHTML = `
                            <h5 class="p-2 bg-danger bg-gradient rounded text-light">Kaybettiniz!</h5>
                            `;
                        }
                    }
                    else {
                        if (data.winner_username === username) {
                            gameOverWinnerInfo.innerHTML = `
                            <h5 class="p-2 bg-success bg-gradient rounded text-light">Kazandınız!</h5>
                            `;
                        }
                        else {
                            gameOverWinnerInfo.innerHTML = `
                            <h5 class="p-2 bg-danger bg-gradient rounded text-light">Kaybettiniz!</h5>
                            `;
                        }
                    }
                    
                    
                    bootstrap.Modal.getInstance(document.getElementById('gameOverModal')).show();
                    break;

                case 'opponent_joined':
                    console.log('Opponent Joined Data:', {
                        opponent: data.opponent_username,
                        playerSide: playerSide
                    });
                    
                    if (data.opponent_username) {
                        if (playerSide === 'left' && !rightPlayerText) {
                            addWallText(data.opponent_username, 15);
                            addWallText('0', 15, true);
                        } else if (playerSide === 'right' && !leftPlayerText) {
                            addWallText(data.opponent_username, -15);
                            addWallText('0', -15, true);
                        }
                    }
                    break;
            }
        };

        gameSocket.onclose = () => {
            console.log('game socket connection closed.');
            if (gameActive) {
                alert('game connection lost!');
            }
        };

        gameSocket.onerror = function (error) {
            console.log('game socket error', error);
        };

        return gameSocket;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const loader = new THREE.TextureLoader();
    const loaderFont = new THREE.FontLoader();

    renderer.setSize(window.innerWidth * 0.8, window.innerHeight * 0.8);

    document.querySelector('.game-container').appendChild(renderer.domElement);

    const topLight = new THREE.SpotLight(0xffffff, 4);
    topLight.position.set(0, 100, 0);
    topLight.castShadow = true;
    scene.add(topLight);

    const bottomLight = new THREE.SpotLight(0xffffff, 1);
    bottomLight.position.set(0, -100, 0);
    bottomLight.castShadow = true;
    scene.add(bottomLight);

    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.1;

    camera.position.set(0, 13, 65);
    camera.lookAt(0, 0, 0);

    window.addEventListener('resize', () => {
        onWindowResize(camera, renderer);
    });

    function onWindowResize(camera, renderer) {
        const aspect = window.innerWidth / window.innerHeight;
        if (window.innerWidth < 768) {
            renderer.setSize(window.innerWidth * 0.7, window.innerHeight * 0.7);
        } else {
            renderer.setSize(window.innerWidth * 0.87, window.innerHeight * 0.87);
        }
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
    }

    loader.load('https://www.manytextures.com/thumbnail/43/512/smooth+sand+dunes.jpg', (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);

        const backgroundGeometry = new THREE.BoxGeometry(100, 50, 100);
        const materials = [
            new THREE.MeshStandardMaterial({ map: texture, side: THREE.BackSide }),
            new THREE.MeshStandardMaterial({ map: texture, side: THREE.BackSide }),
            new THREE.MeshStandardMaterial({ map: texture, side: THREE.BackSide }),
            new THREE.MeshStandardMaterial({ map: texture, side: THREE.BackSide }),
            new THREE.MeshStandardMaterial({ map: texture, side: THREE.BackSide }),
            new THREE.MeshStandardMaterial({ map: texture, side: THREE.BackSide })
        ];

        loader.load('https://www.manytextures.com/thumbnail/44/512/clear+sea+water.jpg', (bottomTexture) => {
            bottomTexture.wrapS = THREE.RepeatWrapping;
            bottomTexture.wrapT = THREE.RepeatWrapping;
            bottomTexture.repeat.set(4, 4);

            materials[3] = new THREE.MeshStandardMaterial({ map: bottomTexture, side: THREE.BackSide, metalness: 0.6, roughness: 0.3 });

            const backgroundBox = new THREE.Mesh(backgroundGeometry, materials);
            scene.add(backgroundBox);
        });
    });

    function addWall(positionX) {
        const wallGeometry = new THREE.BoxGeometry(20, 20, 1);
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(positionX, 0, -50);
        scene.add(wall);
    }

    let leftPlayerText, rightPlayerText, leftScoreText, rightScoreText;

    function addWallText(text, positionX, isScore = false) {
        loaderFont.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
            const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
            const textConfig = {
                font: font,
                size: isScore ? 3 : 2,
                height: 0.1,
            };

            const wallTextGeometry = new THREE.TextGeometry(text, textConfig);
            const wallText = new THREE.Mesh(wallTextGeometry, textMaterial);
            wallTextGeometry.computeBoundingBox();
            const textWidth = wallTextGeometry.boundingBox.max.x - wallTextGeometry.boundingBox.min.x;
            
            const yPosition = isScore ? -5 : 2;
            wallText.position.set(positionX - textWidth / 2, yPosition, -49.5);
            
            if (isScore) {
                if (positionX < 0) {
                    if (leftScoreText) scene.remove(leftScoreText);
                    leftScoreText = wallText;
                } else {
                    if (rightScoreText) scene.remove(rightScoreText);
                    rightScoreText = wallText;
                }
            } else {
                if (positionX < 0) {
                    if (leftPlayerText) scene.remove(leftPlayerText);
                    leftPlayerText = wallText;
                } else {
                    if (rightPlayerText) scene.remove(rightPlayerText);
                    rightPlayerText = wallText;
                }
            }
            
            scene.add(wallText);
        });
    }

    addWall(15);
    addWall(-15);


    var paddleWidth = 1;
    const paddleHeight = 0.5
    const paddleDepth = 4;
    const ballRadius = 0.5;

    const leftPaddleGeometry = new THREE.BoxGeometry(paddleWidth, paddleHeight, paddleDepth);
    const leftPaddleMaterial = new THREE.MeshStandardMaterial({ color: 0x0FBBC8, metalness: 0.3, roughness: 0.2 });
    const leftPaddle = new THREE.Mesh(leftPaddleGeometry, leftPaddleMaterial);
    leftPaddle.position.set(-19.5, -22.5, 0);
    scene.add(leftPaddle);

    const rightPaddleGeometry = new THREE.BoxGeometry(paddleWidth, paddleHeight, paddleDepth);
    const rightPaddleMaterial = new THREE.MeshStandardMaterial({ color: 0x770FC8, metalness: 0.3, roughness: 0.2 });
    const rightPaddle = new THREE.Mesh(rightPaddleGeometry, rightPaddleMaterial);
    rightPaddle.position.set(19.5, -22.5, 0);
    scene.add(rightPaddle);

    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xcccc00, roughness: 0.2 });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(0, -22.2, 0);
    scene.add(ball);

    const tableGeometry = new THREE.BoxGeometry(40, 0.5, 20);
    const tableMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.5,
        metalness: 0.4,
        envMapIntensity: 0.5
    });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(0, -23, 0);
    scene.add(table);


    let gameActive = false;

    function sendPaddleUpdate(position) {
        if (gameSocket.readyState === WebSocket.OPEN) {
            gameSocket.send(JSON.stringify({
                type: 'paddle_update',
                username: username,
                playerSide: playerSide,
                position: position
            }));
        }
    }

    let keys = {};
    document.addEventListener("keydown", (event) => { keys[event.key] = true; });
    document.addEventListener("keyup", (event) => { keys[event.key] = false; });

    function key_control() {
        if (!playerSide || !gameActive || !gameSocket || gameSocket.readyState !== WebSocket.OPEN) return;

        if (playerSide === 'left') {
            if (((keys["s"] || keys["S"]) && leftPaddle.position.z + paddleDepth / 2 < 10)) {
                leftPaddle.position.z += 0.2;
                sendPaddleUpdate(leftPaddle.position);
            }
            if (((keys["w"] || keys["W"]) && leftPaddle.position.z - paddleDepth / 2 > -10)) {
                leftPaddle.position.z -= 0.2;
                sendPaddleUpdate(leftPaddle.position);
            }
        } else if (playerSide === 'right') {
            if (((keys["s"] || keys["S"]) && rightPaddle.position.z + paddleDepth / 2 < 10)) {
                rightPaddle.position.z += 0.2;
                sendPaddleUpdate(rightPaddle.position);
            }
            if (((keys["w"] || keys["W"]) && rightPaddle.position.z - paddleDepth / 2 > -10)) {
                rightPaddle.position.z -= 0.2;
                sendPaddleUpdate(rightPaddle.position);
            }
        }
    }

    const animate = () => {
        requestAnimationFrame(animate);
        key_control();
        renderer.render(scene, camera);
    };

    animate();

    
    if (!gameSocket) {
        gameSocket = await connectToGameSocket();
    }

    window.currentCleanup = () => {
        window.removeEventListener('resize', () => {
            onWindowResize(camera, renderer);
        });

        document.getElementById('goToProfile').removeEventListener('click', handleProfileClick);

        document.removeEventListener("keydown", (event) => { keys[event.key] = true; });
        document.removeEventListener("keyup", (event) => { keys[event.key] = false; });
        
        gameSocket.onmessage = null;
        gameSocket.onopen = null;
        gameSocket.onclose = null;
        gameSocket.onerror = null;


        if (gameSocket && gameSocket.readyState === WebSocket.OPEN) {
            gameActive = false;
            gameSocket.close();
            gameSocket = null;
        }
        roomId = null;
    };
}
