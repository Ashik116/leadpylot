"use client"
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

type TSummaryCard = {
    title: string,
    info: string | number,
    iconName?: string
}

const SummaryCard = ({ title, info, iconName }: TSummaryCard) => {
    return (
        <Card className="shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer" onClick={() => { }}>
            <div className="pb-6 flex justify-between">
                <h3 className="text-moss-2 capitalize">{title || 'N/A'}</h3>
                <Button variant="default" size="xs">Details</Button>
            </div>
            <p className="text-xl font-medium flex items-center">
                {iconName ? <span>€</span> : ''}
                <span>{info}</span>
            </p>
        </Card>
    )
}

export default SummaryCard;