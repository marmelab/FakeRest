import 'babel-core/polyfill';
import Repository from 'Repository';
import Resource from 'Resource';

export default class FakeRest {

    // FIXME find a way to access independent classes from withing tests
    static getClass(name) {
        if (name == 'Repository') return Repository;
        if (name == 'Resource') return Resource;
    }
}
