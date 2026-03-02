const BRAWLERS = ["LEON", "SPIKE", "CROW", "MORTIS", "SHELLY", "COLT", "EL PRIMO", "POCO", "SURGE", "EDGAR", "TARA"];

const Game = {
    peer: null,
    connections: [], 
    conn: null,      
    myNick: "",
    isHost: false,
    players: [], // {nick, conn}

    showJoinInput() {
        document.getElementById('join-area').classList.toggle('hidden');
    },

    // Создание комнаты (Хост)
    initHost() {
        this.myNick = document.getElementById('nick-input').value.toUpperCase() || "ИГРОК";
        this.isHost = true;
        const randomID = Math.floor(1000 + Math.random() * 9000).toString(); // 4-значный ID
        
        this.peer = new Peer('bs-' + randomID);
        this.peer.on('open', (id) => {
            document.getElementById('display-room-id').innerText = id.replace('bs-', '');
            this.players.push({ nick: this.myNick, conn: null });
            this.showLobby();
        });

        this.peer.on('connection', (c) => {
            c.on('open', () => {
                c.on('data', (data) => this.handleData(data, c));
            });
        });
    },

    // Вход в комнату (Клиент)
    initJoin() {
        this.myNick = document.getElementById('nick-input').value.toUpperCase() || "ИГРОК";
        const roomID = document.getElementById('room-input').value;
        this.isHost = false;

        this.peer = new Peer();
        this.peer.on('open', () => {
            this.conn = this.peer.connect('bs-' + roomID);
            this.conn.on('open', () => {
                this.conn.send({ type: 'JOIN', nick: this.myNick });
                this.showLobby();
                document.getElementById('display-room-id').innerText = roomID;
            });
            this.conn.on('data', (data) => this.handleData(data));
        });
    },

    handleData(data, c) {
        if (data.type === 'JOIN') {
            this.players.push({ nick: data.nick, conn: c });
            this.broadcast({ type: 'LIST', list: this.players.map(p => p.nick) });
        }
        if (data.type === 'LIST') this.renderList(data.list);
        
        if (data.type === 'ROLE') {
            this.showRole(data.role, data.brawler);
        }
    },

    // Главная логика распределения
    startRound() {
        if (!this.isHost) return;

        const secretBrawler = BRAWLERS[Math.floor(Math.random() * BRAWLERS.length)];
        const spyIndex = Math.floor(Math.random() * this.players.length);

        this.players.forEach((p, index) => {
            const isSpy = (index === spyIndex);
            const message = {
                type: 'ROLE',
                role: isSpy ? 'ШПИОН' : 'БОЕЦ',
                brawler: isSpy ? '???' : secretBrawler
            };

            if (p.nick === this.myNick) {
                this.showRole(message.role, message.brawler);
            } else {
                p.conn.send(message);
            }
        });
    },

    showRole(role, brawler) {
        document.getElementById('game-reveal').classList.remove('hidden');
        const card = document.getElementById('card-box');
        const nameText = document.getElementById('brawler-name');
        
        nameText.innerText = brawler;
        document.getElementById('role-title').innerText = "ТВОЯ РОЛЬ: " + role;

        if (role === 'ШПИОН') {
            card.style.background = "#f44336"; // Красный для шпиона
            nameText.style.color = "white";
        } else {
            card.style.background = "#ffeb3b"; // Желтый для бойцов
            nameText.style.color = "#000";
        }
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
