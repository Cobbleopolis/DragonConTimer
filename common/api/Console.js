import Game from './Game'

export default class Console {
    constructor(id, name, games) {
        if (typeof(id) ==="string" && Array.isArray(name) && games === undefined) {
            this.id = id.toLowerCase().replace(/\s+/, "")
            this.name = id;
            this.games = name.map(obj => new Game(obj.name, obj.count))
                .sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : -1);
        } else {
            this.id = id;
            this.name = name;
            this.games = games.map(obj => new Game(obj.name, obj.count))
                .sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : -1);
        }

    }
}