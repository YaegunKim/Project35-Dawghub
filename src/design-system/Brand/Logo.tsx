import { brand } from '../colors'
import { S } from './Logo.style'

type LogoProps = {
  size?: number
  withWordmark?: boolean
}

export function Logo({ size = 32, withWordmark = false }: LogoProps) {
  return (
    <S.Wrapper>
      <S.Mark width={size} height={size} viewBox="0 0 512 512" role="img" aria-label="DawgHub">
        <rect width="512" height="512" rx="120" fill={brand.primary} />
        <ellipse cx="184" cy="198" rx="42" ry="60" transform="rotate(-30 184 198)" fill={brand.white} stroke={brand.black} strokeWidth="10" />
        <ellipse cx="328" cy="198" rx="42" ry="60" transform="rotate(30 328 198)" fill={brand.white} stroke={brand.black} strokeWidth="10" />
        <ellipse cx="256" cy="302" rx="158" ry="118" fill={brand.white} stroke={brand.black} strokeWidth="11" />
        <path d="M192,235 Q256,213 320,235" fill="none" stroke={brand.black} strokeWidth="7" strokeLinecap="round" />
        <path d="M202,256 Q256,240 310,256" fill="none" stroke={brand.black} strokeWidth="7" strokeLinecap="round" />
        <circle cx="201" cy="282" r="15" fill={brand.black} />
        <circle cx="311" cy="282" r="15" fill={brand.black} />
        <ellipse cx="256" cy="360" rx="108" ry="58" fill={brand.white} stroke={brand.black} strokeWidth="10" />
        <ellipse cx="256" cy="342" rx="26" ry="19" fill={brand.black} />
        <path d="M232,354 Q206,378 180,384" fill="none" stroke={brand.black} strokeWidth="7" strokeLinecap="round" />
        <path d="M280,354 Q306,378 332,384" fill="none" stroke={brand.black} strokeWidth="7" strokeLinecap="round" />
      </S.Mark>
      {withWordmark && <S.Wordmark>DawgHub</S.Wordmark>}
    </S.Wrapper>
  )
}
