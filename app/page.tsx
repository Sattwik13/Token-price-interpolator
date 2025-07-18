import PriceForm from '../components/PriceForm';
import { Toaster } from 'react-hot-toast';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <PriceForm />
      <Toaster position="top-right" reverseOrder={false} />
    </main>
  );
}