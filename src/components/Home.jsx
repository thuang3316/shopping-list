import { Link } from 'react-router-dom';

export function Home() {
    return (
        <div className="flex flex-col gap-16 pb-20">
            <section className="relative bg-amber-400 w-full py-20 px-6 rounded-b-[4rem] shadow-xl overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-amber-300 rounded-full blur-3xl opacity-50"></div>
                
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
                    <div className="flex flex-col gap-6 text-center md:text-left">
                        <h1 className="text-5xl md:text-7xl font-black text-amber-950 leading-tight tracking-tighter">
                            QUALITY STUFF <br /> 
                            <span className="text-white italic underline decoration-amber-950">SIMPLIFIED.</span>
                        </h1>
                        <p className="text-lg text-amber-900 font-bold max-w-md mx-auto md:mx-0">
                            The best products, curated just for you. No fluff, just the essentials you actually need.
                        </p>
                        <Link 
                            to="/shop" 
                            className="bg-amber-950 text-amber-400 px-10 py-5 rounded-full font-black text-xl uppercase tracking-widest hover:bg-white hover:text-amber-950 transition-all duration-300 shadow-2xl w-fit mx-auto md:mx-0 hover:scale-105 active:scale-95"
                        >
                            Start Shopping
                        </Link>
                    </div>

                    <div className="hidden md:block w-80 h-80 bg-white rounded-[3rem] shadow-2xl rotate-3 p-8 border-4 border-amber-950">
                        <div className="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center text-amber-950 text-6xl">
                            🎁
                        </div>
                    </div>
                </div>
            </section>

            <section className="max-w-6xl mx-auto w-full px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center font-black">
                    <div className="p-8 bg-white border-2 border-amber-100 rounded-3xl">
                        <div className="text-3xl mb-2">🚚</div>
                        <h3 className="text-amber-950 uppercase tracking-widest">Fast Shipping</h3>
                        <p className="text-sm text-gray-400 font-bold mt-2">Delivered to your door in 48 hours.</p>
                    </div>
                    <div className="p-8 bg-amber-950 text-amber-400 rounded-3xl shadow-lg scale-105">
                        <div className="text-3xl mb-2">🛡️</div>
                        <h3 className="uppercase tracking-widest">Secure Payments</h3>
                        <p className="text-sm opacity-70 font-bold mt-2">Your data is always 100% encrypted.</p>
                    </div>
                    <div className="p-8 bg-white border-2 border-amber-100 rounded-3xl">
                        <div className="text-3xl mb-2">✨</div>
                        <h3 className="text-amber-950 uppercase tracking-widest">Premium Quality</h3>
                        <p className="text-sm text-gray-400 font-bold mt-2">Only the best brands in our catalog.</p>
                    </div>
                </div>
            </section>

            <section className="max-w-6xl mx-auto w-full px-6 flex flex-col gap-8">
                <div className="flex justify-between items-end">
                    <h2 className="text-3xl font-black text-amber-950 uppercase">Shop by Vibe</h2>
                    <Link to="/shop" className="text-amber-600 font-black border-b-4 border-amber-200 hover:border-amber-400 transition-all">
                        View All Categories →
                    </Link>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {['Electronics', 'Food', 'Men', 'Women'].map((cat) => (
                        <Link 
                            key={cat}
                            to="/shop" 
                            className="h-40 bg-gray-50 rounded-4xl flex items-center justify-center font-black text-gray-400 uppercase tracking-widest hover:bg-amber-100 hover:text-amber-800 transition-colors border-2 border-transparent hover:border-amber-300"
                        >
                            {cat}
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}