import { Building2, FileText, GraduationCap, Handshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UI_PRESETS } from '@/lib/ui-presets';

export type CenterFormTab = 'center' | 'agreement' | 'general' | 'history';

type CenterFormTabsProps = {
    activeTab: CenterFormTab;
    onTabChange: (tab: CenterFormTab) => void;
    isReadOnly: boolean;
};

export default function CenterFormTabs({ activeTab, onTabChange, isReadOnly }: CenterFormTabsProps) {
    return (
        <div className="flex flex-wrap items-end gap-1.5">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`${UI_PRESETS.tabBase} ${
                    activeTab === 'center'
                        ? UI_PRESETS.tabActive
                        : UI_PRESETS.tabInactive
                }`}
                onClick={() => onTabChange('center')}
            >
                <Building2 className="mr-1.5 size-4 shrink-0" />
                Centro
            </Button>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`${UI_PRESETS.tabBase} ${
                    activeTab === 'agreement'
                        ? UI_PRESETS.tabActive
                        : UI_PRESETS.tabInactive
                }`}
                onClick={() => onTabChange('agreement')}
            >
                <Handshake className="mr-1.5 size-4 shrink-0" />
                Convenio
            </Button>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`${UI_PRESETS.tabBase} ${
                    activeTab === 'general'
                        ? UI_PRESETS.tabActive
                        : UI_PRESETS.tabInactive
                }`}
                onClick={() => onTabChange('general')}
            >
                <FileText className="mr-1.5 size-4 shrink-0" />
                Notas
            </Button>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => isReadOnly && onTabChange('history')}
                disabled={!isReadOnly}
                className={`${UI_PRESETS.tabBase} ${
                    !isReadOnly
                        ? UI_PRESETS.tabDisabled
                        : activeTab === 'history'
                            ? UI_PRESETS.tabActive
                            : UI_PRESETS.tabInactive
                }`}
            >
                <GraduationCap className="mr-1.5 size-4 shrink-0" />
                Alumnos
            </Button>
        </div>
    );
}
