import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'HashFrog Tracker',
  description: 'Just another tracker for OoTR',
};

const RootLayout = ({ children }) => {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
};

export default RootLayout;
