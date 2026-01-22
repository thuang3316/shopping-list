import { Link } from "react-router";
import '../styling/styles.css';

export function Nav() {
    return (
        <nav className="flex justify-center items-center gap-4 bg-amber-400 px-4 font-extrabold">
            <Link to="/" className="font-mono text-2xl">Home</Link>
            <Link to="/shop" className="font-mono text-2xl">Shop</Link>
            <Link to="/cart" className="font-mono text-2xl">Cart</Link>
        </nav>
    )
}