const BRAWLERS = ["LEON", "SPIKE", "CROW", "MORTIS", "SHELLY", "COLT", "EL PRIMO", "POCO", "SURGE", "EDGAR", "TARA", "AMBER", "PIPER"];

const Game = {
    peer: null,
    myNick: "",
    isHost: false,
    players: [], // Массив объектов {nick, conn}

    showJoinInput() {
        document.getElementById('join-area').classList.toggle('hidden');
    },

    // ХОСТ: Создание лобби
    initHost() {
        this.myNick = document.getElementById('nick-input').value.toUpperCase() || "PLAYER";
        this.isHost = true;
        const randomID = Math.floor(1000 + Math.random() * 8999).toString(); 
        
        this.peer = new Peer('bs-' + randomID);

        this.peer.on('open', (id) => {
            document.getElementById('display-room-id').innerText = id.replace('bs-', '');
            this.players.push({ nick: this.myNick, conn: null }); // Хост без коннекта к себе
            this.showLobby();
        });

        this.peer.on('connection', (conn) => {
            conn.on('open', () => {
                conn.on('data', (data) => this.handleData(data, conn));
            });
        });

        this.peer.on('error', (err) => {
            alert("Ошибка сети! Попробуй другой ник или создай заново.");
            location.reload();
        });
    },

    // КЛИЕНТ: Подключение
    initJoin() {
        this.myNick = document.getElementById('nick-input').value.toUpperCase() || "PLAYER";
        const roomID = document.getElementById('room-input').value.trim();
        this.isHost = false;

        this.peer = new Peer();
        this.peer.on('open', () => {
            const conn = this.peer.connect('bs-' + roomID);
            conn.on('open', () => {
                this.players.push({ nick: "HOST", conn: conn }); // Клиент знает только хоста
                conn.send({ type: 'JOIN', nick: this.myNick });
                this.showLobby();
                document.getElementById('display-room-id').innerText = roomID;
            });
            conn.on('data', (data) => this.handleData(data));
        });
    },

    handleData(data, conn) {
        // Хост получает данные от игроков
        if (data.type === 'JOIN' && this.isHost) {
            this.players.push({ nick: data.nick, conn: conn });
            this.broadcast({ type: 'LIST', list: this.players.map(p => p.nick) });
        }
        
        // Все получают список игроков
        if (data.type === 'LIST') this.renderList(data.list);
        
        // Получение роли
        if (data.type === 'ROLE') {
            this.showRole(data.role, data.brawler);
        }

        // Рестарт раунда
        if (data.type === 'RESET') {
            document.getElementById('game-reveal').classList.add('hidden');
        }
    },

    startRound() {
        if (!this.isHost) return;
        const secretBrawler = BRAWLERS[Math.floor(Math.random() * BRAWLERS.length)];
        const spyIndex = Math.floor(Math.random() * this.players.length);

        this.players.forEach((p, index) => {
            const isSpy = (index === spyIndex);
            const rolePayload = {
                type: 'ROLE',
                role: isSpy ? 'ШПИОН' : 'БОЕЦ',
                brawler: isSpy ? '???' : secretBrawler
            };

            if (p.nick === this.myNick) {
                this.showRole(rolePayload.role, rolePayload.brawler);
            } else {
                p.conn.send(rolePayload);
            }
        });

        document.getElementById('start-btn').classList.add('hidden');
        document.getElementById('restart-btn').classList.remove('hidden');
    },

    resetGame() {
        this.broadcast({ type: 'RESET' });
        document.getElementById('game-reveal').classList.add('hidden');
        document.getElementById('restart-btn').classList.add('hidden');
        document.getElementById('start-btn').classList.remove('hidden');
    },

    showRole(role, brawler) {
        document.getElementById('game-reveal').classList.remove('hidden');
        const card = document.getElementById('card-box');
        const nameText = document.getElementById('brawler-name');
        
        nameText.innerText = brawler;
        document.getElementById('role-title').innerText = "ТВОЯ РОЛЬ: " + role;
        card.style.background = (role === 'ШПИОН') ? "#f44336" : "#ffeb3b";
        nameText.style.color = (role === 'ШПИОН') ? "#fff" : "#000";
    },

    broadcast(data) {
        this.players.forEach(p => { if(p.conn) p.conn.send(data); });
        this.renderList(this.players.map(p => p.nick));
    },

    renderList(list) {
        const div = document.getElementById('player-list');
        div.innerHTML = list.map(n => `<div class="player-item">${n}</div>`).join('');
        document.getElementById('p-count').innerText = list.length;
    },

    showLobby() {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('lobby-screen').classList.remove('hidden');
        if (this.isHost) document.getElementById('host-controls').classList.remove('hidden');
    }
};
