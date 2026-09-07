import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import DownloadIcon from '@mui/icons-material/Download'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import GridOnIcon from '@mui/icons-material/GridOn'
import { useAppDispatch, useAppSelector } from './store/hooks.ts'
import {
  fetchAllContributions,
  selectAllPersons,
  selectContributionsError,
  selectContributionsPages,
  selectContributionsStatus,
  selectRawFirstPage,
} from './store/contributionsSlice.ts'
import { exportPersonsToExcel } from './utils/exportExcel.ts'

export function App() {
  const [token, setToken] = useState('')
  const dispatch = useAppDispatch()

  const persons = useAppSelector(selectAllPersons)
  const status = useAppSelector(selectContributionsStatus)
  const error = useAppSelector(selectContributionsError)
  const pages = useAppSelector(selectContributionsPages)
  const raw = useAppSelector(selectRawFirstPage)

  const loading = status === 'loading'

  function handleSubmit() {
    const trimmed = token.trim()
    if (!trimmed) {
      return
    }
    void dispatch(fetchAllContributions(trimmed))
  }

  function handleExport() {
    exportPersonsToExcel(persons)
  }

  return (
    <Container maxWidth='md' sx={{ py: 4 }}>
      <Typography variant='h4' component='h1' gutterBottom>
        Family Search Data Fetch
      </Typography>
      <Typography color='text.secondary' sx={{ mb: 3 }}>
        Paste a Bearer access token from an authenticated{' '}
        <Link href='https://www.familysearch.org' target='_blank' rel='noreferrer'>
          familysearch.org
        </Link>{' '}
        browser session (DevTools → Network → any request to familysearch.org → the
        <code> Authorization </code> header). Tokens expire after about an hour.
      </Typography>

      <Box
        component='form'
        action={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}
      >
        <TextField
          id='token'
          label='Access token'
          type='password'
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder='eyJ… or b0-…'
          autoComplete='off'
          spellCheck={false}
          fullWidth
          slotProps={{ input: { sx: { fontFamily: 'monospace' } } }}
        />
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            type='submit'
            variant='contained'
            disabled={loading || !token.trim()}
            startIcon={loading ? <CircularProgress size={18} color='inherit'/> : <DownloadIcon/>}
          >
            {loading ? 'Fetching all…' : 'Fetch all related persons'}
          </Button>
          <Button
            type='button'
            variant='outlined'
            color='success'
            onClick={handleExport}
            disabled={persons.length === 0}
            startIcon={<GridOnIcon/>}
          >
            Export to Excel
          </Button>
        </Box>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress/>
        </Box>
      )}

      {status === 'failed' && (
        <Alert severity='error' sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      {status === 'succeeded' && (
        <Box sx={{ mt: 4 }}>
          <Typography variant='h6' component='h2'>
            Related persons ({persons.length})
          </Typography>
          <Typography color='text.secondary' sx={{ mb: 2 }}>
            Fetched across {pages} page(s).
          </Typography>
          {persons.length > 0 ? (
            <TableContainer component={Paper} variant='outlined'>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Person id</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {persons.map((person) => (
                    <TableRow key={person.id} hover>
                      <TableCell>{person.name}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{person.id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color='text.secondary'>
              No persons parsed from the response — check the raw payload below for its actual shape.
            </Typography>
          )}
        </Box>
      )}

      {raw && (
        <Accordion defaultExpanded={status === 'succeeded' && persons.length === 0} sx={{ mt: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon/>}>Raw response</AccordionSummary>
          <AccordionDetails>
            <Box
              component='pre'
              sx={{ m: 0, overflow: 'auto', bgcolor: 'grey.100', p: 1.5, borderRadius: 1, fontSize: 13 }}
            >
              {raw}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}
    </Container>
  )
}
