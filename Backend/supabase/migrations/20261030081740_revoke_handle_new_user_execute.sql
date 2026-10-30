-- handle_new_user는 auth.users 트리거로만 실행된다.
-- public 스키마의 함수는 기본으로 anon·authenticated가 실행할 수 있어 /rest/v1/rpc로 노출되므로 실행 권한을 회수한다.
-- 트리거가 함수를 부를 때는 EXECUTE 권한을 확인하지 않으므로 회수해도 회원가입 시 프로필 생성은 그대로 동작한다.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
