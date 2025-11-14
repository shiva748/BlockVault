import {configureStore} from "@reduxjs/toolkit"
import accountReducer from "./reducers/accountSlice"

const store = configureStore({
    reducer:{
        account:accountReducer
    }
})

export default store;