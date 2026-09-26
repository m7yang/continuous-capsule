export type CapsuleOptions<IncludeFocus extends boolean = true> = {
  width: number;
  height: number;
  borderWidth?: number;
  focusGap?: number;
  focusWidth?: number;
  includeFocus?: IncludeFocus;
};

export type CapsuleSurfaceGeometry = {
  surfacePath: string;
  inset: number;
};

export type CapsuleGeometry = CapsuleSurfaceGeometry & {
  focusPath: string;
};

export declare const profileId: 'swiftui-macos-27.0-26A428-render-fit-v1';
export declare function createCapsuleGeometry(options: CapsuleOptions): CapsuleGeometry | null;
export declare function createCapsuleGeometry(options: CapsuleOptions<false> & { includeFocus: false }): CapsuleSurfaceGeometry | null;
export declare function createCapsuleGeometry(options: CapsuleOptions<boolean>): CapsuleSurfaceGeometry | CapsuleGeometry | null;

export type ContinuousRectangleOptions<IncludeFocus extends boolean = true> = CapsuleOptions<IncludeFocus> & { radius: number };
export declare function createContinuousRectangleGeometry(options: ContinuousRectangleOptions): CapsuleGeometry | null;
export declare function createContinuousRectangleGeometry(options: ContinuousRectangleOptions<false> & { includeFocus: false }): CapsuleSurfaceGeometry | null;
export declare function createContinuousRectangleGeometry(options: ContinuousRectangleOptions<boolean>): CapsuleSurfaceGeometry | CapsuleGeometry | null;
