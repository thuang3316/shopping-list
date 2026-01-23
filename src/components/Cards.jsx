import decreaseImg from '../assets/decrease.svg'
import increaseImg from '../assets/increase.svg'
import trashImg from '../assets/trash.svg'

export function Card({product, setCards}) {

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
        <div 
            className='flex flex-col items-center p-6 bg-white rounded-xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 gap-4' 
            key={product.id}
        >
            {/* Image Container with subtle background for better product isolation */}
            <div className='w-64 h-72 p-6 bg-gray-50 rounded-lg flex items-center justify-center'> 
                <img 
                    src={product.image} 
                    alt={product.title}
                    className='w-full h-full object-contain mix-blend-multiply' 
                />
            </div>

            {/* Text Content */}
            <div className="flex flex-col gap-1 items-center px-2">
                <h3 className="text-sm font-medium text-gray-700 line-clamp-2 h-10 text-center">
                    {product.title}
                </h3>
                <span className="text-xl font-bold text-gray-900">
                    ${product.price.toFixed(2)}
                </span>
            </div>

            {/* Actions - Keeping your original button logic & styling */}
            <div className='flex gap-4 mt-auto'>
                {product.count > 0 ? (
                    <div className='flex items-center gap-6 rounded-full border-2 border-amber-300 px-5 py-2 bg-white shadow-sm'>
                        <button 
                            type='button' 
                            className="transition-opacity hover:opacity-70 flex justify-center items-center" 
                            onClick={() => handleDecrease(product.id)}
                        >
                            <img 
                                src={product.count > 1 ? decreaseImg : trashImg} 
                                alt="decrease" 
                                className='w-5 h-5 cursor-pointer'
                            />
                        </button>
                        
                        <span className="font-bold text-lg w-4 text-center">
                            {product.count}
                        </span>

                        <button 
                            type='button' 
                            className="transition-opacity hover:opacity-70 flex justify-center items-center"
                            onClick={() => handleIncrease(product.id)}
                        >
                            <img 
                                src={increaseImg} 
                                alt="increase" 
                                className='w-5 h-5 cursor-pointer'
                            />
                        </button>
                    </div>
                ) : (
                    <button 
                        type='button' 
                        className="bg-amber-300 text-amber-900 font-semibold px-8 py-3 rounded-full transition-all duration-200 hover:bg-amber-400 hover:scale-105 active:scale-95 shadow-md" 
                        onClick={() => handleIncrease(product.id)}
                    >
                        Add to cart
                    </button>
                )}
            </div>
        </div>
    )
}