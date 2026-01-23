import decreaseImg from '../assets/decrease.svg'
import increaseImg from '../assets/increase.svg'
import trashImg from '../assets/trash.svg'
import { Link } from 'react-router';

export function Cart({cards, setCards}) {
    const cartItems = cards.filter(item => item.count > 0);
    const subTotal = cartItems.reduce((acc, cur) => acc + cur.count * cur.price, 0).toFixed(2);

    const totalItems = cartItems.length;

    const handleIncrease = (id) => {
        setCards(prev => {
            return prev.map(item => {
                if (item.id === id) {
                    return {...item, count: item.count + 1};
                }
                return item;
            });
        })
    }

    const handleDecrease = (id) => {
        setCards(prev => {
            return prev.map(item => {
                if (item.id === id) {
                    return {...item, count: item.count - 1};
                }
                return item;
            });
        })
    }

    return (
    <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-black text-amber-950 mb-8 px-2 uppercase tracking-tight">
            Your Shopping Bag
        </h1>

        {cartItems.length > 0 ? (
            <div className="flex flex-col lg:flex-row justify-center gap-8 items-start">
                <ul className="flex flex-col gap-6 w-full lg:w-2/3">
                    {cartItems.map(item => (
                        <div 
                            key={item.id} 
                            className="flex flex-col sm:flex-row gap-6 bg-white border border-gray-100 rounded-4xl p-6 shadow-sm transition-hover duration-300 hover:shadow-md"
                        >
                            <div className="w-full sm:w-48 h-48 bg-gray-50 rounded-2xl p-4 flex shrink-0 items-center justify-center">
                                <img src={item.image} alt={item.title} className='max-h-full object-contain mix-blend-multiply' />
                            </div>

                            <div className="flex flex-col justify-between flex-1 py-2">
                                <div className="flex justify-between gap-4">
                                    <h3 className="font-bold text-lg text-gray-800 line-clamp-2">{item.title}</h3>
                                    <div className="text-xl font-black text-amber-950">
                                        ${(item.price * item.count).toFixed(2)}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-4">
                                    <div className='flex items-center gap-4 rounded-full border-2 border-amber-300 px-4 py-1.5 bg-white shadow-sm'>
                                        <button type='button' className="hover:opacity-60 transition-opacity" onClick={() => handleDecrease(item.id)}>
                                            <img src={item.count > 1 ? decreaseImg : trashImg} alt="decrease" className='w-5 h-5'/>
                                        </button>
                                        <div className="font-bold text-amber-950 min-w-5 text-center">{item.count}</div>
                                        <button type='button' className="hover:opacity-60 transition-opacity" onClick={() => handleIncrease(item.id)}>
                                            <img src={increaseImg} alt="increase" className='w-5 h-5'/>
                                        </button>
                                    </div>
                                    <div className="text-sm text-gray-400 font-medium">${item.price} each</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </ul>

                <div id="sidebar" className="w-full lg:w-1/3 sticky top-24 bg-amber-50 border-2 border-amber-200 p-8 rounded-[2.5rem] shadow-sm flex flex-col gap-6">
                    <h2 className="text-xl font-black text-amber-950 uppercase italic">Order Summary</h2>
                    <div className="space-y-3 border-b-2 border-amber-200 pb-6 font-bold text-amber-900/70">
                        <div className="flex justify-between">
                            <span>Subtotal ({totalItems})</span>
                            <span>${subTotal}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Shipping</span>
                            <span className="text-green-600 uppercase text-xs tracking-widest">Free</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center text-2xl font-black text-amber-950">
                        <span>Total</span>
                        <span>${subTotal}</span>
                    </div>
                    <button type="button" className="w-full bg-amber-400 text-amber-950 font-black py-4 rounded-full text-lg shadow-[0_4px_0_rgb(217,119,6)] transition-all hover:translate-y-0.5 hover:shadow-[0_6px_0_rgb(217,119,6)] active:translate-y-0.5 active:shadow-none uppercase tracking-wider">
                        Proceed to checkout
                    </button>
                </div>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-20 px-4 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                <div className="bg-amber-100 p-6 rounded-full mb-6 text-4xl">🛒</div>
                <h2 className="text-2xl font-black text-gray-800 mb-2">Your cart is feeling light...</h2>
                <p className="text-gray-500 mb-8 text-center max-w-sm">
                    Looks like you hasn't added anything yet. Start exploring our latest products!
                </p>
                <Link 
                    to="/shop" 
                    className="bg-amber-950 text-amber-400 px-10 py-4 rounded-full font-black uppercase tracking-widest hover:bg-amber-800 transition-colors shadow-lg"
                >
                    Return to Shop
                </Link>
            </div>
        )}
    </div>
);
}