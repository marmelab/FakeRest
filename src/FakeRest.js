import 'babel-core/polyfill';
import Repository from 'Repository';

export default class FakeRest {
    constructor(repository) {
        this._repository = repository || new Repository();
    }

    get repository() {
        return this._repository
    }
}
