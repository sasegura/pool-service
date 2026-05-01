import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button, Card } from '../../../components/ui/Common';

type Props = {
  onBack: () => void;
  title: string;
  subtitle: string;
  backLabel: string;
};

export function RouteLoadingView({ onBack, title, subtitle, backLabel }: Props) {
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 w-11 p-0 rounded-xl"
          onClick={onBack}
          aria-label={backLabel}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-black text-slate-900">{title}</h2>
          <p className="text-slate-500">{subtitle}</p>
        </div>
      </header>
      <Card className="p-6">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="font-medium">{subtitle}</span>
        </div>
      </Card>
    </div>
  );
}
