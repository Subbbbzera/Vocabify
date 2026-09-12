import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import NavigBar from './components/NavigBar'
import UserProfile from './components/UserProfile'
import MainDictionary from './pages/MainDictionary'
import InnerD from './pages/InnerD'
import Practice from './pages/Practice'
import WordDetails from './pages/WordDetails'
import Account from './pages/Account'
import Notifications from './pages/Notifications'
import Friends from './pages/Friends'


function App() {
 
  
  return (
  <>
  
  <NavigBar/> 
  <UserProfile/>
    
  <Routes>

    <Route path='/' element={<Home/>}/>
    <Route path='/mainDictionary' element={<MainDictionary/>}/>
    <Route path='/InnerD/:id' element={<InnerD/>}/>
    <Route path='/practice/:id' element={<Practice/>}/>
    <Route path='/WordDetails/:id' element={<WordDetails/>}/>
    <Route path='/account' element={<Account/>}/>
    <Route path='/notifications' element={<Notifications/>}/>
    <Route path='/friends' element={<Friends/>}/>
  </Routes>


  </>

)
}

export default App
