import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit'
import type { EntityState } from '@reduxjs/toolkit'
import { fetchAllContributionsByPerson, FsApiError } from '../api/familySearch.ts'
import type { IPerson } from '../api/familySearch.ts'

type FetchStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

// Normalized storage: persons keyed by their PID (IPerson.id, the adapter default).
const personsAdapter = createEntityAdapter<IPerson>()

interface ContributionsState extends EntityState<IPerson, string> {
  status: FetchStatus
  error: string | null
  // How many network pages the last download walked through.
  pages: number
  // Raw first page payload, kept for the "Raw response" debug view.
  rawFirstPage: string
}

const initialState: ContributionsState = personsAdapter.getInitialState({
  status: 'idle',
  error: null,
  pages: 0,
  rawFirstPage: '',
})

// Download every page of the user's contributions and hand the result to the
// reducer. The token is the Bearer access token pasted by the user.
export const fetchAllContributions = createAsyncThunk<
  { persons: IPerson[]; pages: number; rawFirstPage: string },
  string,
  { rejectValue: string }
>('contributions/fetchAll', async (token, { rejectWithValue }) => {
  try {
    const { persons, pages, firstPage } = await fetchAllContributionsByPerson({ token })
    return { persons, pages, rawFirstPage: JSON.stringify(firstPage, null, 2) }
  } catch (cause) {
    if (cause instanceof FsApiError) {
      return rejectWithValue(cause.message)
    }
    return rejectWithValue(String(cause))
  }
})

const contributionsSlice = createSlice({
  name: 'contributions',
  initialState,
  reducers: {
    cleared(state) {
      personsAdapter.removeAll(state)
      state.status = 'idle'
      state.error = null
      state.pages = 0
      state.rawFirstPage = ''
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllContributions.pending, (state) => {
        state.status = 'loading'
        state.error = null
        personsAdapter.removeAll(state)
        state.pages = 0
        state.rawFirstPage = ''
      })
      .addCase(fetchAllContributions.fulfilled, (state, action) => {
        state.status = 'succeeded'
        personsAdapter.setAll(state, action.payload.persons)
        state.pages = action.payload.pages
        state.rawFirstPage = action.payload.rawFirstPage
      })
      .addCase(fetchAllContributions.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? action.error.message ?? 'Unknown error'
      })
  },
})

export const { cleared } = contributionsSlice.actions
export const contributionsReducer = contributionsSlice.reducer

// Selectors (bound to the slice's location in the root state).
export const {
  selectAll: selectAllPersons,
  selectById: selectPersonById,
  selectIds: selectPersonIds,
  selectTotal: selectPersonCount,
} = personsAdapter.getSelectors((state: { contributions: ContributionsState }) => state.contributions)

export const selectContributionsStatus = (state: { contributions: ContributionsState }) =>
  state.contributions.status
export const selectContributionsError = (state: { contributions: ContributionsState }) =>
  state.contributions.error
export const selectContributionsPages = (state: { contributions: ContributionsState }) =>
  state.contributions.pages
export const selectRawFirstPage = (state: { contributions: ContributionsState }) =>
  state.contributions.rawFirstPage
