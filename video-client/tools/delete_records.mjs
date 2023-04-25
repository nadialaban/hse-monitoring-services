import {deleteAsync} from 'del';

try {


    console.log(`deleted!`)
} catch (err) {
    console.error(`Error while deleting`, err)
}
