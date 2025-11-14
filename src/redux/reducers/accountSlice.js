import {createSlice} from "@reduxjs/toolkit"

const accountSlice = createSlice({
    name:"account",
    initialState:{
        accountId:null,
        accounts:[]
    },
    reducers:{
        setAccounts: (state, action) =>{
            const accountsArray = action.payload || [];
            state.accounts = accountsArray;
            state.accountId = accountsArray.length ? accountsArray[0] : null;
        },
        setActiveAccount: (state, action) =>{
            const selectedAccount = action.payload;
            if (state.accounts.includes(selectedAccount)) {
                state.accountId = selectedAccount;
            }
        },
        logout : (state)=>{
            state.accountId = null;
            state.accounts = [];
        }
    }
})

export const {setAccounts, setActiveAccount, logout} = accountSlice.actions;
export default accountSlice.reducer;