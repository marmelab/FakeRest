import 'babel-core/polyfill';
import Repository from 'Repository';
import Collection from 'Collection';

export default class FakeRest {

    // FIXME find a way to access independent classes from within tests
    static getClass(name) {
        if (name == 'Repository') return Repository;
        if (name == 'Collection') return Collection;
    }
}
