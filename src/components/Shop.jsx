import { useEffect } from 'react'
import { Card } from './Cards';

export function Shop({cards, setCards}) {

    useEffect(() => {
        if (cards.length === 0) {
            const promises = [];
            for (let i = 1; i <= 20; i++) {
                promises.push(
                    fetch(`https://fakestoreapi.com/products/${i}`)
                        .then(res => res.json())
                        .then(res => {return {...res, count: 0}})
                );
            }

            Promise.all(promises)
                .then(data => {
                    setCards(data); 
                })
                .catch(err => console.error("Error fetching products:", err));
        }  
    }, [cards.length, setCards]);

    return (
        <>
            <ul className="grid grid-cols-5 gap-5">
                {cards.map(product => <Card product={product} setCards={setCards} />)}
            </ul>
        </>
    )
}