import Home from './pages/Home.js';
import { useSelector } from "react-redux";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Navbar from './components/Navbar.js';
import UploadPage from './pages/Upload.js';
import MyFiles from './pages/MyFiles.js';

const App = () => {
  const account = useSelector(state => state.account);

  return (
    <Router>

      {/* SHOW NAVBAR ONLY IF LOGGED IN */}
      {account.accountId && <Navbar />}

      <Routes>

        {/* PUBLIC ROUTE */}
        {!account.accountId && (
          <Route path="/" element={<Home />} />
        )}

        {/* PROTECTED ROUTES */}
        {account.accountId && (
          <>
            <Route path="/" element={<UploadPage/>} />
            <Route path="/upload" element={<UploadPage/>} />
            <Route path="/my-files" element={<MyFiles/>} />
          </>
        )}

      </Routes>
    </Router>
  );
};

export default App;
